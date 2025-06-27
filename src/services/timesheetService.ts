import { ITimesheetService, ITimeTrackingClient, ITimesheetGenerator, IDataProcessor } from '../interfaces';

export class TimesheetService implements ITimesheetService {
  constructor(
    private timeTrackingClient: ITimeTrackingClient,
    private dataProcessor: IDataProcessor,
    private timesheetGenerator: ITimesheetGenerator
  ) {}

  async generateMonthlyTimesheet(year: number, month: number): Promise<string> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00Z';
    const endDateStr = endDate.toISOString().split('T')[0] + 'T23:59:59Z';

    console.log(`${year}年${month}月の勤務データを取得中...`);
    const timeEntries = await this.timeTrackingClient.getTimeEntries(startDateStr, endDateStr);

    if (timeEntries.length === 0) {
      console.log('指定期間のデータが見つかりませんでした。');
      return '';
    }

    console.log('プロジェクト情報を取得中...');
    const projects = await this.timeTrackingClient.getProjects();
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    console.log(`${timeEntries.length}件のエントリを処理中...`);
    const workDays = this.dataProcessor.processTimeEntries(timeEntries, projectMap);

    return await this.timesheetGenerator.generateTimesheet(workDays, year, month);
  }
}