import * as fs from 'fs';
import { ITimesheetGenerator, IConfigurationService } from '../interfaces';
import { WorkDay } from '../types';
import { TimesheetTableBuilder } from './timesheetTableBuilder';

export class CsvTimesheetGenerator implements ITimesheetGenerator {
  private tableBuilder = new TimesheetTableBuilder();

  constructor(private configService: IConfigurationService) {}

  async generateTimesheet(
    workDays: WorkDay[],
    year: number,
    month: number
  ): Promise<string> {
    const settings = this.configService.getExcelSettings();
    const showDescription = settings.showDescription ?? false;

    const table = this.tableBuilder.build(workDays, year, month, {
      showDescription,
    });

    // CSV行を生成
    const lines: string[] = [];

    // ヘッダー行
    lines.push(this.toCsvLine(table.headers));

    // データ行
    for (const row of table.rows) {
      const values = this.tableBuilder.rowToArray(row, { showDescription });
      lines.push(this.toCsvLine(values));
    }

    const csvContent = lines.join('\n');

    // BOM付きUTF-8で保存（Excelで開いた時の文字化け対策）
    const filename = `勤務表_${year}年${month}月.csv`;
    const bom = '\uFEFF';
    fs.writeFileSync(filename, bom + csvContent, 'utf-8');

    console.log(`勤務表を生成しました: ${filename}`);
    console.log(`月合計勤務時間: ${table.totalHours.toFixed(2)}時間`);
    console.log(`出勤日数: ${table.workDayCount}日`);

    return filename;
  }

  /**
   * 配列をCSV行に変換（カンマ、改行、ダブルクォートをエスケープ）
   */
  private toCsvLine(values: string[]): string {
    return values
      .map((v) => {
        // カンマ、改行、ダブルクォートを含む場合はクォートで囲む
        if (v.includes(',') || v.includes('\n') || v.includes('"')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      })
      .join(',');
  }
}
