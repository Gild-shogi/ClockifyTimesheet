import { IDataProcessor, IConfigurationService } from '../interfaces';
import { TimeEntry, Project, WorkDay, WorkSession } from '../types';

export class TimeEntryDataProcessor implements IDataProcessor {
  constructor(private configService: IConfigurationService) {}

  processTimeEntries(timeEntries: TimeEntry[], projects: Map<string, Project>): WorkDay[] {
    const timezone = this.configService.getTimezone();
    const workDayMap = new Map<string, WorkDay>();

    timeEntries.forEach((entry) => {
      const project = projects.get(entry.projectId);
      const projectName = project?.name || 'プロジェクト不明';

      const sessions = this.splitSessionsByDate(entry, projectName, timezone);

      sessions.forEach((session) => {
        if (!workDayMap.has(session.date)) {
          const date = new Date(session.date);
          workDayMap.set(session.date, {
            date: session.date,
            dayOfWeek: this.getDayOfWeek(date),
            sessions: [],
          });
        }

        workDayMap.get(session.date)!.sessions.push(session);
      });
    });

    // 各日付内のセッションを開始時刻順にソート
    workDayMap.forEach((workDay) => {
      workDay.sessions.sort((a, b) => {
        const timeA = this.parseTime(a.startTime);
        const timeB = this.parseTime(b.startTime);
        return timeA - timeB;
      });
    });

    // 日付順にソートして返す
    return Array.from(workDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private splitSessionsByDate(
    entry: TimeEntry,
    projectName: string,
    timezone: string
  ): WorkSession[] {
    // UTC時刻を指定タイムゾーンに変換
    const startDate = this.convertToTimezone(entry.timeInterval.start, timezone);
    const endDate = this.convertToTimezone(entry.timeInterval.end, timezone);

    const startDateStr = this.formatDateString(startDate);
    const endDateStr = this.formatDateString(endDate);

    // 同日の場合
    if (startDateStr === endDateStr) {
      return [
        {
          date: startDateStr,
          startTime: this.formatTime(startDate),
          endTime: this.formatTime(endDate),
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
      startTime: this.formatTime(startDate),
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
      endTime: this.formatTime(endDate),
      workHours: (endDate.getTime() - endDayStart.getTime()) / (1000 * 60 * 60),
      projectName,
    });

    return sessions;
  }

  private convertToTimezone(utcTimeString: string, timezone: string): Date {
    const utcDate = new Date(utcTimeString);
    // JavaScriptのDateオブジェクトを使ってタイムゾーン変換
    const timeInTimezone = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    return timeInTimezone;
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}