import axios from 'axios';
import * as dotenv from 'dotenv';
import * as ExcelJS from 'exceljs';

dotenv.config();

interface TimeEntry {
  id: string;
  description: string;
  start: string;
  end: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
  project: {
    id: string;
    name: string;
  };
  task?: {
    id: string;
    name: string;
  };
}

interface ClockifyConfig {
  apiKey: string;
  workspaceId: string;
  userId: string;
  baseUrl: string;
}

class ClockifyTimesheetGenerator {
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

  private formatDuration(duration: string): number {
    if (!duration || duration === 'PT0S') return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = Number.parseInt(match[1] || '0');
    const minutes = Number.parseInt(match[2] || '0');
    const seconds = Number.parseInt(match[3] || '0');

    return hours + minutes / 60 + seconds / 3600;
  }

  private processTimeEntries(timeEntries: TimeEntry[]): Map<string, Map<string, number>> {
    const projectHours = new Map<string, Map<string, number>>();

    timeEntries.forEach((entry) => {
      const projectName = entry.project?.name || 'プロジェクト不明';
      const date = new Date(entry.timeInterval.start).toISOString().split('T')[0];
      const duration = this.formatDuration(entry.timeInterval.duration);

      if (!projectHours.has(projectName)) {
        projectHours.set(projectName, new Map<string, number>());
      }

      const dateHours = projectHours.get(projectName)!;
      const currentHours = dateHours.get(date) || 0;
      dateHours.set(date, currentHours + duration);
    });

    return projectHours;
  }

  async generateExcel(year: number, month: number): Promise<string> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = `${startDate.toISOString().split('T')[0]}T00:00:00Z`;
    const endDateStr = `${endDate.toISOString().split('T')[0]}T23:59:59Z`;

    console.log(`${year}年${month}月の勤務データを取得中...`);
    const timeEntries = await this.getTimeEntries(startDateStr, endDateStr);

    if (timeEntries.length === 0) {
      console.log('指定期間のデータが見つかりませんでした。');
      return '';
    }

    console.log(`${timeEntries.length}件のエントリを処理中...`);
    const projectHours = this.processTimeEntries(timeEntries);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年${month}月勤務表`);

    const daysInMonth = endDate.getDate();
    const headers = ['プロジェクト'];
    for (let day = 1; day <= daysInMonth; day++) {
      headers.push(`${day}日`);
    }
    headers.push('合計時間');

    worksheet.addRow(headers);

    let totalMonthlyHours = 0;
    projectHours.forEach((dateHours, projectName) => {
      const row = [projectName];
      let projectTotal = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hours = dateHours.get(dateStr) || 0;
        row.push(hours > 0 ? hours.toFixed(2) : '');
        projectTotal += hours;
      }

      row.push(projectTotal.toFixed(2));
      worksheet.addRow(row);
      totalMonthlyHours += projectTotal;
    });

    const totalRow = ['合計'];
    for (let day = 1; day <= daysInMonth; day++) {
      let dayTotal = 0;
      projectHours.forEach((dateHours) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayTotal += dateHours.get(dateStr) || 0;
      });
      totalRow.push(dayTotal > 0 ? dayTotal.toFixed(2) : '');
    }
    totalRow.push(totalMonthlyHours.toFixed(2));
    worksheet.addRow(totalRow);

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    headers.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = 12;
    });

    const filename = `勤務表_${year}年${month}月.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log(`勤務表を生成しました: ${filename}`);
    console.log(`月合計勤務時間: ${totalMonthlyHours.toFixed(2)}時間`);

    return filename;
  }
}

async function main() {
  const apiKey = process.env.CLOCKIFY_API_KEY;
  const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;
  const userId = process.env.CLOCKIFY_USER_ID;

  if (!apiKey || !workspaceId || !userId) {
    console.error('環境変数を設定してください:');
    console.error('CLOCKIFY_API_KEY: ClockifyのAPIキー');
    console.error('CLOCKIFY_WORKSPACE_ID: ワークスペースID');
    console.error('CLOCKIFY_USER_ID: ユーザーID');
    process.exit(1);
  }

  const generator = new ClockifyTimesheetGenerator(apiKey, workspaceId, userId);

  const args = process.argv.slice(2);
  let year: number;
  let month: number;

  if (args.length >= 2) {
    // 引数で年月を指定: pnpm start 2025 1
    year = Number.parseInt(args[0], 10);
    month = Number.parseInt(args[1], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      console.error('使い方: pnpm start [年] [月]');
      console.error('例: pnpm start 2025 1  (2025年1月の勤務表を生成)');
      process.exit(1);
    }
  } else {
    // 引数なしの場合は現在の月
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  try {
    await generator.generateExcel(year, month);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ClockifyTimesheetGenerator };
