export interface TimeEntry {
  id: string;
  description: string;
  start: string;
  end: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
  projectId: string;
  task?: {
    id: string;
    name: string;
  };
}

export interface ClockifyConfig {
  apiKey: string;
  workspaceId: string;
  userId: string;
  baseUrl: string;
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  workspaceId: string;
}

export interface WorkSession {
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  projectName: string;
  /** 作業内容の説明 */
  description?: string;
}

export interface WorkDay {
  date: string;
  dayOfWeek: string;
  sessions: WorkSession[];
}

// アプリケーション設定

export type BorderStyle = 'thin' | 'medium' | 'thick';

export interface ExcelConfig {
  /** ヘッダー背景色（16進数、例: '4472C4'） */
  headerColor: string;
  /** 交互行の背景色（16進数、例: 'F2F2F2'） */
  alternateRowColor?: string;
  /** 罫線スタイル */
  borderStyle: BorderStyle;
  /** フォントサイズ */
  fontSize: number;
  /** フォント名 */
  fontName: string;
  /** 日付グループの区切り罫線 */
  dateGroupBorder?: {
    style: BorderStyle;
    color: string;
  };
  /** 作業内容（Description）列を表示するか */
  showDescription?: boolean;
}

export interface GoogleSheetsConfig {
  /** スプレッドシートID（URLの /d/ と /edit の間の部分） */
  spreadsheetId: string;
  /** サービスアカウント認証情報JSONファイルのパス */
  credentialsPath: string;
}

export interface AppConfig {
  /** タイムゾーン（例: 'Asia/Tokyo'） */
  timezone: string;
  /** Excel出力設定 */
  excel: ExcelConfig;
  /** 出力形式: 'excel' | 'csv' | 'googleSheets' */
  outputFormat?: 'excel' | 'csv' | 'googleSheets';
  /** Google Sheets設定（outputFormat: 'googleSheets' の場合に必要） */
  googleSheets?: GoogleSheetsConfig;
}

// 勤務表テーブルの共通データ構造

export interface TimesheetRow {
  /** 日付表示（例: '12/01'）、空文字の場合は同日の2行目以降 */
  date: string;
  /** 曜日 */
  dayOfWeek: string;
  /** プロジェクト名 */
  projectName: string;
  /** 作業内容 */
  description: string;
  /** 出勤時刻 */
  startTime: string;
  /** 退勤時刻 */
  endTime: string;
  /** 労働時間（h:mm形式） */
  workHoursFormatted: string;
  /** 労働時間（小数） */
  workHoursDecimal: string;
  /** 合計行かどうか */
  isTotal?: boolean;
  /** 日付グループのインデックス（交互背景色用） */
  dateGroupIndex?: number;
}

export interface TimesheetTable {
  /** ヘッダー行 */
  headers: string[];
  /** データ行 */
  rows: TimesheetRow[];
  /** 月合計時間 */
  totalHours: number;
  /** 出勤日数 */
  workDayCount: number;
  /** 年 */
  year: number;
  /** 月 */
  month: number;
}
