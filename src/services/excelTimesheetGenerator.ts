import * as ExcelJS from 'exceljs';
import { ITimesheetGenerator, IConfigurationService } from '../interfaces';
import { WorkDay } from '../types';

export class ExcelTimesheetGenerator implements ITimesheetGenerator {
  constructor(private configService: IConfigurationService) {}

  async generateTimesheet(workDays: WorkDay[], year: number, month: number): Promise<string> {
    const settings = this.configService.getExcelSettings();
    const showDescription = settings.showDescription ?? false;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年${month}月勤務表`);

    // ヘッダー行を作成
    const headers = [
      '日付',
      '曜日',
      'プロジェクト',
      ...(showDescription ? ['作業内容'] : []),
      '出勤時刻',
      '退勤時刻',
      '労働時間',
      '労働時間(h)',
    ];
    const colCount = headers.length;
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
          const [, m, d] = session.date.split('-');
          row.getCell(1).value = `${m}/${d}`;
          row.getCell(2).value = workDay.dayOfWeek;
        } else {
          // 2行目以降は日付と曜日は空白
          row.getCell(1).value = '';
          row.getCell(2).value = '';
        }

        // 列番号はshowDescriptionによって変わる
        let col = 3;
        row.getCell(col++).value = session.projectName;
        if (showDescription) {
          row.getCell(col++).value = session.description || '';
        }
        row.getCell(col++).value = session.startTime;
        row.getCell(col++).value = session.endTime;
        row.getCell(col++).value = this.formatWorkHoursAsTime(session.workHours);
        row.getCell(col++).value = session.workHours.toFixed(2);

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
    totalRow.getCell(colCount - 1).value = this.formatWorkHoursAsTime(totalMonthlyHours);
    totalRow.getCell(colCount).value = totalMonthlyHours.toFixed(2);

    const lastRow = currentRow;

    // スタイリング適用
    this.applyStyles(worksheet, settings, lastRow, dateGroupRanges, colCount, showDescription);

    // ファイル保存
    const filename = `勤務表_${year}年${month}月.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log(`勤務表を生成しました: ${filename}`);
    console.log(`月合計勤務時間: ${totalMonthlyHours.toFixed(2)}時間`);
    console.log(`出勤日数: ${workDays.length}日`);

    return filename;
  }

  private applyStyles(
    worksheet: ExcelJS.Worksheet,
    settings: ReturnType<IConfigurationService['getExcelSettings']>,
    lastRow: number,
    dateGroupRanges: { start: number; end: number; date: string }[],
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

    // ヘッダー行のスタイル（表の範囲のみ）
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

  private formatWorkHoursAsTime(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;

    return `${h}:${min.toString().padStart(2, '0')}`;
  }
}