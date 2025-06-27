import { Container } from './container';

async function main() {
  const container = new Container();
  const timesheetService = container.getTimesheetService();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    await timesheetService.generateMonthlyTimesheet(year, month);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// レガシーサポートのため、従来のクラスもエクスポート
export { ClockifyClient } from './clockifyClient';
export { ExcelGenerator } from './excelGenerator';
export * from './types';
export * from './interfaces';

// 新しいサービス層
export { Container } from './container';
export { ConfigurationService } from './services/configurationService';
export { ClockifyTimeTrackingClient } from './services/clockifyTimeTrackingClient';
export { TimeEntryDataProcessor } from './services/dataProcessor';
export { ExcelTimesheetGenerator } from './services/excelTimesheetGenerator';
export { TimesheetService } from './services/timesheetService';
