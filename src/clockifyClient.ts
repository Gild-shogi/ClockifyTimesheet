import axios from 'axios';
import { loadAppSettings } from './settings';
import { ClockifyConfig, Project, TimeEntry, WorkDay, WorkSession } from './types';

export class ClockifyClient {
  private config: ClockifyConfig;

  constructor(apiKey: string, workspaceId: string, userId: string) {
    this.config = {
      apiKey,
      workspaceId,
      userId,
      baseUrl: 'https://api.clockify.me/api/v1',
    };
  }

  private async makeRequest(endpoint: string, params?: any): Promise<any> {
    try {
      const response = await axios.get(`${this.config.baseUrl}${endpoint}`, {
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        params,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Clockify API request failed: ${error}`);
    }
  }

  async getTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const endpoint = `/workspaces/${this.config.workspaceId}/user/${this.config.userId}/time-entries`;
    const params = {
      start: startDate,
      end: endDate,
      'page-size': 5000,
    };

    return await this.makeRequest(endpoint, params);
  }

  async getProject(projectId: string): Promise<Project> {
    const endpoint = `/workspaces/${this.config.workspaceId}/projects/${projectId}`;
    return await this.makeRequest(endpoint);
  }

  async getProjects(): Promise<Project[]> {
    const endpoint = `/workspaces/${this.config.workspaceId}/projects`;
    return await this.makeRequest(endpoint);
  }

  static formatDuration(duration: string): number {
    if (!duration || duration === 'PT0S') return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = Number.parseInt(match[1] || '0');
    const minutes = Number.parseInt(match[2] || '0');
    const seconds = Number.parseInt(match[3] || '0');

    return hours + minutes / 60 + seconds / 3600;
  }

  static processTimeEntries(timeEntries: TimeEntry[], projects: Map<string, Project>): WorkDay[] {
    const settings = loadAppSettings();
    const workDayMap = new Map<string, WorkDay>();

    timeEntries.forEach((entry) => {
      const project = projects.get(entry.projectId);
      const projectName = project?.name || 'プロジェクト不明';

      // 日付跨ぎ対応：開始時刻と終了時刻を処理
      const sessions = ClockifyClient.splitSessionsByDate(entry, projectName, settings.timezone);

      sessions.forEach((session) => {
        if (!workDayMap.has(session.date)) {
          const date = new Date(session.date);
          workDayMap.set(session.date, {
            date: session.date,
            dayOfWeek: ClockifyClient.getDayOfWeek(date),
            sessions: [],
          });
        }

        workDayMap.get(session.date)?.sessions.push(session);
      });
    });

    // 各日付内のセッションを開始時刻順にソート
    workDayMap.forEach((workDay) => {
      workDay.sessions.sort((a, b) => {
        const timeA = ClockifyClient.parseTime(a.startTime);
        const timeB = ClockifyClient.parseTime(b.startTime);
        return timeA - timeB;
      });
    });

    // 日付順にソートして返す
    return Array.from(workDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private static splitSessionsByDate(
    entry: TimeEntry,
    projectName: string,
    timezone: string
  ): WorkSession[] {
    // UTC時刻を指定タイムゾーンに変換
    const startDate = ClockifyClient.convertToTimezone(entry.timeInterval.start, timezone);
    const endDate = ClockifyClient.convertToTimezone(entry.timeInterval.end, timezone);

    const startDateStr = ClockifyClient.formatDateString(startDate);
    const endDateStr = ClockifyClient.formatDateString(endDate);

    // 同日の場合
    if (startDateStr === endDateStr) {
      return [
        {
          date: startDateStr,
          startTime: ClockifyClient.formatTime(startDate),
          endTime: ClockifyClient.formatTime(endDate),
          workHours: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
          projectName,
        },
      ];
    }
    // 日付跨ぎの場合：開始日と終了日に分割
    const sessions: WorkSession[] = [];

    // 開始日：開始時刻〜24:00
    const nextDayStart = new Date(startDate);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    nextDayStart.setHours(0, 0, 0, 0);

    sessions.push({
      date: startDateStr,
      startTime: ClockifyClient.formatTime(startDate),
      endTime: '24:00',
      workHours: (nextDayStart.getTime() - startDate.getTime()) / (1000 * 60 * 60),
      projectName,
    });

    // 終了日：0:00〜終了時刻
    const endDayStart = new Date(endDate);
    endDayStart.setHours(0, 0, 0, 0);

    sessions.push({
      date: endDateStr,
      startTime: '0:00',
      endTime: ClockifyClient.formatTime(endDate),
      workHours: (endDate.getTime() - endDayStart.getTime()) / (1000 * 60 * 60),
      projectName,
    });

    return sessions;
  }

  private static formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  private static getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private static convertToTimezone(utcTimeString: string, timezone: string): Date {
    const utcDate = new Date(utcTimeString);
    // JavaScriptのDateオブジェクトを使ってタイムゾーン変換
    const timeInTimezone = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    return timeInTimezone;
  }

  private static formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
