import { config } from 'dotenv';
import { Container } from './container';

// 環境変数を読み込み
config();

async function main() {
  const container = new Container();
  const timesheetService = container.getTimesheetService();

  const args = process.argv.slice(2);
  let year: number;
  let month: number;

  if (args.length >= 2) {
    // 引数で年月を指定: pnpm generate 2025 1
    year = Number.parseInt(args[0], 10);
    month = Number.parseInt(args[1], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      console.error('使い方: pnpm generate [年] [月]');
      console.error('例: pnpm generate 2025 1  (2025年1月の勤務表を生成)');
      process.exit(1);
    }
  } else {
    // 引数なしの場合は現在の月
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

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
