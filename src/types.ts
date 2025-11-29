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

export interface AppConfig {
  /** タイムゾーン（例: 'Asia/Tokyo'） */
  timezone: string;
  /** Excel出力設定 */
  excel: ExcelConfig;
}
