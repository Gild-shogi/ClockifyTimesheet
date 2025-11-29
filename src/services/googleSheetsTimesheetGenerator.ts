import { google } from 'googleapis';
import { IConfigurationService, ITimesheetGenerator } from '../interfaces';
import { WorkDay } from '../types';
import { TimesheetTableBuilder } from './timesheetTableBuilder';

export interface GoogleSheetsConfig {
  /** スプレッドシートID */
  spreadsheetId: string;
  /** サービスアカウント認証情報ファイルのパス */
  credentialsPath: string;
}

export class GoogleSheetsTimesheetGenerator implements ITimesheetGenerator {
  private tableBuilder = new TimesheetTableBuilder();

  constructor(
    private configService: IConfigurationService,
    private sheetsConfig: GoogleSheetsConfig
  ) {}

  async generateTimesheet(workDays: WorkDay[], year: number, month: number): Promise<string> {
    const settings = this.configService.getExcelSettings();
    const showDescription = settings.showDescription ?? false;

    // 共通のテーブルデータを生成
    const table = this.tableBuilder.build(workDays, year, month, {
      showDescription,
    });

    // Google Sheets API認証
    const auth = new google.auth.GoogleAuth({
      keyFile: this.sheetsConfig.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetTitle = `${year}年${month}月`;

    // シートが存在するか確認し、なければ作成
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: this.sheetsConfig.spreadsheetId,
    });

    const existingSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetTitle);

    if (existingSheet) {
      // 既存シートをクリア
      await sheets.spreadsheets.values.clear({
        spreadsheetId: this.sheetsConfig.spreadsheetId,
        range: `${sheetTitle}!A:Z`,
      });
    } else {
      // 新しいシートを作成
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetsConfig.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });
    }

    // データを準備
    const values: string[][] = [];

    // ヘッダー行
    values.push(table.headers);

    // データ行
    for (const row of table.rows) {
      values.push(this.tableBuilder.rowToArray(row, { showDescription }));
    }

    // データを書き込み
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetsConfig.spreadsheetId,
      range: `${sheetTitle}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    // スタイリングを適用
    await this.applyStyles(sheets, this.sheetsConfig.spreadsheetId, sheetTitle, table, settings);

    const url = `https://docs.google.com/spreadsheets/d/${this.sheetsConfig.spreadsheetId}/edit#gid=${existingSheet?.properties?.sheetId ?? 0}`;

    console.log(`勤務表を生成しました: ${sheetTitle}`);
    console.log(`URL: ${url}`);
    console.log(`月合計勤務時間: ${table.totalHours.toFixed(2)}時間`);
    console.log(`出勤日数: ${table.workDayCount}日`);

    return url;
  }

  private async applyStyles(
    sheets: ReturnType<typeof google.sheets>,
    spreadsheetId: string,
    sheetTitle: string,
    table: ReturnType<TimesheetTableBuilder['build']>,
    settings: ReturnType<IConfigurationService['getExcelSettings']>
  ): Promise<void> {
    // シートIDを取得
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetTitle);
    const sheetId = sheet?.properties?.sheetId ?? 0;

    const requests: any[] = [];
    const colCount = table.headers.length;
    const rowCount = table.rows.length + 1; // +1 for header

    // ヘッダー行のスタイル
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: this.hexToRgb(settings.headerColor),
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // 全体の中央揃え
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)',
      },
    });

    // 合計行のスタイル（太字）
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowCount - 1,
          endRowIndex: rowCount,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat(textFormat)',
      },
    });

    // 列幅の設定
    const columnWidths = [80, 50, 150];
    if (settings.showDescription) {
      columnWidths.push(200);
    }
    columnWidths.push(80, 80, 80, 80);

    columnWidths.forEach((width, index) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1,
          },
          properties: { pixelSize: width },
          fields: 'pixelSize',
        },
      });
    });

    // 罫線を追加
    requests.push({
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: rowCount,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        top: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
        bottom: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
        left: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
        right: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
        innerHorizontal: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
        innerVertical: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
      },
    });

    // 交互行の背景色
    if (settings.alternateRowColor) {
      let dateGroupIndex = -1;
      let groupStartRow = 1;

      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        if (row.isTotal) continue;

        if (row.dateGroupIndex !== dateGroupIndex) {
          if (dateGroupIndex >= 0 && dateGroupIndex % 2 === 1) {
            requests.push({
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: groupStartRow,
                  endRowIndex: i + 1,
                  startColumnIndex: 0,
                  endColumnIndex: colCount,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: this.hexToRgb(settings.alternateRowColor),
                  },
                },
                fields: 'userEnteredFormat(backgroundColor)',
              },
            });
          }
          dateGroupIndex = row.dateGroupIndex!;
          groupStartRow = i + 1;
        }
      }

      // 最後のグループ
      if (dateGroupIndex >= 0 && dateGroupIndex % 2 === 1) {
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: groupStartRow,
              endRowIndex: table.rows.length, // 合計行を除く
              startColumnIndex: 0,
              endColumnIndex: colCount,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: this.hexToRgb(settings.alternateRowColor),
              },
            },
            fields: 'userEnteredFormat(backgroundColor)',
          },
        });
      }
    }

    // リクエストを実行
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }
  }

  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { red: 0, green: 0, blue: 0 };
    }
    return {
      red: Number.parseInt(result[1], 16) / 255,
      green: Number.parseInt(result[2], 16) / 255,
      blue: Number.parseInt(result[3], 16) / 255,
    };
  }
}
