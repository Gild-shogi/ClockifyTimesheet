import {
  ITimesheetService,
  ITimeTrackingClient,
  ITimesheetGenerator,
  IDataProcessor,
  IConfigurationService,
} from '../interfaces';

export class TimesheetService implements ITimesheetService {
  constructor(
    private timeTrackingClient: ITimeTrackingClient,
    private dataProcessor: IDataProcessor,
    private timesheetGenerator: ITimesheetGenerator,
    private configService: IConfigurationService
  ) {}

  async generateMonthlyTimesheet(year: number, month: number): Promise<string> {
    const timezone = this.configService.getTimezone();
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // 設定タイムゾーンでの月初0時・月末23:59:59をUTCに変換
    const startDateStr = this.convertToUTC(year, month, 1, 0, 0, 0, timezone);
    const endDateStr = this.convertToUTC(year, month, lastDay, 23, 59, 59, timezone);

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

  /**
   * 指定タイムゾーンでの日時をUTC ISO文字列に変換
   * 例: Asia/Tokyo の 2024-01-01 00:00:00 → 2023-12-31T15:00:00.000Z
   *
   * ホストOSのタイムゾーンに依存せず、Intl.DateTimeFormat.formatToParts()を使用して
   * 指定タイムゾーンのオフセットを計算する
   */
  private convertToUTC(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timezone: string
  ): string {
    // UTC基準の日時を作成
    const utcRef = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    // 指定タイムゾーンでの日時コンポーネントを取得（ホストTZに依存しない）
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(utcRef);
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0');

    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    let tzHour = getPart('hour');
    // hour12: false でも "24" が返る場合があるため 0 に正規化
    if (tzHour === 24) tzHour = 0;
    const tzMinute = getPart('minute');
    const tzSecond = getPart('second');

    // 指定タイムゾーンでの日時をUTCミリ秒として計算
    const tzAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);

    // オフセット = タイムゾーン表示時刻（UTCとして計算） - 実際のUTC時刻
    const offsetMs = tzAsUtcMs - utcRef.getTime();

    // 目標のUTC = 指定日時（UTC数値として） - オフセット
    const targetUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs);

    return targetUtc.toISOString();
  }
}