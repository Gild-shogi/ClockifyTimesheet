import * as ExcelJS from 'exceljs';
import { ExcelSettings, loadExcelSettings } from './settings';
import { WorkDay } from './types';

export class ExcelGenerator {
  static async generateTimesheetExcel(
    workDays: WorkDay[],
    year: number,
    month: number
  ): Promise<string> {
    const settings = loadExcelSettings();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年${month}月勤務表`);

    // ヘッダー行を作成
    const headers = [
      '日付',
      '曜日',
      'プロジェクト',
      '出勤時刻',
      '退勤時刻',
      '労働時間',
      '労働時間(h)',
    ];
    worksheet.addRow(headers);

    let totalMonthlyHours = 0;
    let currentRow = 2; // ヘッダーの次の行から開始
    const dateGroupRanges: { start: number; end: number; date: string }[] = [];

    // 出勤がある日だけ処理
    workDays.forEach((workDay) => {
      if (workDay.sessions.length === 0) return;

      const dateGroupStart = currentRow;

      // 同じ日の複数セッションを処理
      workDay.sessions.forEach((session, index) => {
        const row = worksheet.getRow(currentRow);

        // 最初のセッションの場合は日付と曜日を表示
        if (index === 0) {
          const [, month, day] = session.date.split('-');
          row.getCell(1).value = `${month}/${day}`;
          row.getCell(2).value = workDay.dayOfWeek;
        } else {
          // 2行目以降は日付と曜日は空白
          row.getCell(1).value = '';
          row.getCell(2).value = '';
        }

        row.getCell(3).value = session.projectName;
        row.getCell(4).value = session.startTime;
        row.getCell(5).value = session.endTime;
        row.getCell(6).value = ExcelGenerator.formatWorkHoursAsTime(session.workHours);
        row.getCell(7).value = session.workHours.toFixed(2);

        totalMonthlyHours += session.workHours;
        currentRow++;
      });

      // 日付グループの範囲を記録
      dateGroupRanges.push({
        start: dateGroupStart,
        end: currentRow - 1,
        date: workDay.date,
      });
    });

    // 合計行を追加
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = '合計';
    totalRow.getCell(6).value = ExcelGenerator.formatWorkHoursAsTime(totalMonthlyHours);
    totalRow.getCell(7).value = totalMonthlyHours.toFixed(2);

    const lastRow = currentRow;

    // スタイリング適用
    ExcelGenerator.applyStyles(worksheet, settings, lastRow, dateGroupRanges);

    // ファイル保存
    const filename = `勤務表_${year}年${month}月.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log(`勤務表を生成しました: ${filename}`);
    console.log(`月合計勤務時間: ${totalMonthlyHours.toFixed(2)}時間`);
    console.log(`出勤日数: ${workDays.length}日`);

    return filename;
  }

  private static applyStyles(
    worksheet: ExcelJS.Worksheet,
    settings: ExcelSettings,
    lastRow: number,
    dateGroupRanges: { start: number; end: number; date: string }[]
  ): void {
    // 列幅設定
    worksheet.getColumn(1).width = 10; // 日付
    worksheet.getColumn(2).width = 6; // 曜日
    worksheet.getColumn(3).width = 20; // プロジェクト
    worksheet.getColumn(4).width = 12; // 出勤時刻
    worksheet.getColumn(5).width = 12; // 退勤時刻
    worksheet.getColumn(6).width = 12; // 労働時間(h:min)
    worksheet.getColumn(7).width = 12; // 労働時間(decimal)

    // 全体のフォント設定
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 7; col++) {
        const cell = worksheet.getCell(row, col);
        cell.font = {
          name: settings.fontName,
          size: settings.fontSize,
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // ヘッダー行のスタイル（表の範囲のみ）
    for (let col = 1; col <= 7; col++) {
      const headerCell = worksheet.getCell(1, col);
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
        for (let col = 1; col <= 7; col++) {
          const cell = worksheet.getCell(row, col);

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
    for (let col = 1; col <= 7; col++) {
      const headerCell = worksheet.getCell(1, col);
      const totalCell = worksheet.getCell(lastRow, col);

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

  private static formatWorkHoursAsTime(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;

    return `${h}:${min.toString().padStart(2, '0')}`;
  }
}
