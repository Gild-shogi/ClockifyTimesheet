import * as ExcelJS from 'exceljs';
import { IConfigurationService, ITimesheetGenerator } from '../interfaces';
import { TimesheetRow, WorkDay } from '../types';
import { TimesheetTableBuilder } from './timesheetTableBuilder';

export class ExcelTimesheetGenerator implements ITimesheetGenerator {
  private tableBuilder = new TimesheetTableBuilder();

  constructor(private configService: IConfigurationService) {}

  async generateTimesheet(workDays: WorkDay[], year: number, month: number): Promise<string> {
    const settings = this.configService.getExcelSettings();
    const showDescription = settings.showDescription ?? false;

    // 共通のテーブルデータを生成
    const table = this.tableBuilder.build(workDays, year, month, {
      showDescription,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年${month}月勤務表`);

    const colCount = table.headers.length;

    // ヘッダー行を作成
    worksheet.addRow(table.headers);

    // 日付グループの範囲を追跡（スタイリング用）
    const dateGroupRanges: { start: number; end: number }[] = [];
    let currentRow = 2;
    let currentGroupIndex = -1;
    let groupStart = currentRow;

    // データ行を追加
    for (const row of table.rows) {
      if (row.isTotal) {
        // 合計行
        const excelRow = worksheet.getRow(currentRow);
        const values = this.tableBuilder.rowToArray(row, { showDescription });
        values.forEach((v, i) => {
          excelRow.getCell(i + 1).value = v;
        });
      } else {
        // 通常行
        const excelRow = worksheet.getRow(currentRow);
        const values = this.tableBuilder.rowToArray(row, { showDescription });
        values.forEach((v, i) => {
          excelRow.getCell(i + 1).value = v;
        });

        // 日付グループの追跡
        if (row.dateGroupIndex !== currentGroupIndex) {
          if (currentGroupIndex >= 0) {
            dateGroupRanges.push({ start: groupStart, end: currentRow - 1 });
          }
          currentGroupIndex = row.dateGroupIndex!;
          groupStart = currentRow;
        }
      }
      currentRow++;
    }

    // 最後のグループを追加
    if (currentGroupIndex >= 0) {
      dateGroupRanges.push({ start: groupStart, end: currentRow - 2 }); // -2 because currentRow was incremented and we don't want to include total row
    }

    const lastRow = currentRow - 1;

    // スタイリング適用
    this.applyStyles(worksheet, settings, lastRow, dateGroupRanges, colCount, showDescription);

    // ファイル保存
    const filename = `勤務表_${year}年${month}月.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log(`勤務表を生成しました: ${filename}`);
    console.log(`月合計勤務時間: ${table.totalHours.toFixed(2)}時間`);
    console.log(`出勤日数: ${table.workDayCount}日`);

    return filename;
  }

  private applyStyles(
    worksheet: ExcelJS.Worksheet,
    settings: ReturnType<IConfigurationService['getExcelSettings']>,
    lastRow: number,
    dateGroupRanges: { start: number; end: number }[],
    colCount: number,
    showDescription: boolean
  ): void {
    // 列幅設定
    let col = 1;
    worksheet.getColumn(col++).width = 10; // 日付
    worksheet.getColumn(col++).width = 6; // 曜日
    worksheet.getColumn(col++).width = 20; // プロジェクト
    if (showDescription) {
      worksheet.getColumn(col++).width = 30; // 作業内容
    }
    worksheet.getColumn(col++).width = 12; // 出勤時刻
    worksheet.getColumn(col++).width = 12; // 退勤時刻
    worksheet.getColumn(col++).width = 12; // 労働時間(h:min)
    worksheet.getColumn(col++).width = 12; // 労働時間(decimal)

    // 全体のフォント設定
    for (let row = 1; row <= lastRow; row++) {
      for (let c = 1; c <= colCount; c++) {
        const cell = worksheet.getCell(row, c);
        cell.font = {
          name: settings.fontName,
          size: settings.fontSize,
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // ヘッダー行のスタイル
    for (let c = 1; c <= colCount; c++) {
      const headerCell = worksheet.getCell(1, c);
      headerCell.font = {
        name: settings.fontName,
        size: settings.fontSize,
        bold: true,
        color: { argb: 'FFFFFF' },
      };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: settings.headerColor },
      };
    }

    // 合計行のスタイル
    const totalRow = worksheet.getRow(lastRow);
    totalRow.font = {
      name: settings.fontName,
      size: settings.fontSize,
      bold: true,
    };

    // 日付グループごとの罫線と背景色
    dateGroupRanges.forEach((group, index) => {
      const isAlternate = index % 2 === 1;

      for (let row = group.start; row <= group.end; row++) {
        for (let c = 1; c <= colCount; c++) {
          const cell = worksheet.getCell(row, c);

          // 交互背景色
          if (isAlternate && settings.alternateRowColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: settings.alternateRowColor },
            };
          }

          // 基本罫線
          cell.border = {
            top: { style: settings.borderStyle, color: { argb: '000000' } },
            left: { style: settings.borderStyle, color: { argb: '000000' } },
            bottom: { style: settings.borderStyle, color: { argb: '000000' } },
            right: { style: settings.borderStyle, color: { argb: '000000' } },
          };

          // 日付グループ境界線（太い線）
          if (row === group.start) {
            cell.border.top = {
              style: settings.dateGroupBorder.style,
              color: { argb: settings.dateGroupBorder.color },
            };
          }
          if (row === group.end) {
            cell.border.bottom = {
              style: settings.dateGroupBorder.style,
              color: { argb: settings.dateGroupBorder.color },
            };
          }
        }
      }
    });

    // ヘッダー行と合計行の罫線
    for (let c = 1; c <= colCount; c++) {
      const headerCell = worksheet.getCell(1, c);
      const totalCell = worksheet.getCell(lastRow, c);

      headerCell.border = {
        top: {
          style: settings.dateGroupBorder.style,
          color: { argb: settings.dateGroupBorder.color },
        },
        left: { style: settings.borderStyle, color: { argb: '000000' } },
        bottom: {
          style: settings.dateGroupBorder.style,
          color: { argb: settings.dateGroupBorder.color },
        },
        right: { style: settings.borderStyle, color: { argb: '000000' } },
      };

      totalCell.border = {
        top: {
          style: settings.dateGroupBorder.style,
          color: { argb: settings.dateGroupBorder.color },
        },
        left: { style: settings.borderStyle, color: { argb: '000000' } },
        bottom: {
          style: settings.dateGroupBorder.style,
          color: { argb: settings.dateGroupBorder.color },
        },
        right: { style: settings.borderStyle, color: { argb: '000000' } },
      };
    }
  }
}
