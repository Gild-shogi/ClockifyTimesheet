import { AppConfig, ExcelConfig, BorderStyle } from './types';

// 後方互換性のための型エイリアス
export type ExcelSettings = ExcelConfig & {
  dateGroupBorder: {
    style: BorderStyle;
    color: string;
  };
};
export type OutputFormat = 'excel' | 'csv';

export type AppSettings = AppConfig & {
  excel: ExcelSettings;
  outputFormat: OutputFormat;
};

export const defaultExcelSettings: ExcelSettings = {
  headerColor: '4472C4',
  alternateRowColor: 'F2F2F2',
  borderStyle: 'thin',
  fontSize: 11,
  fontName: 'Meiryo UI',
  dateGroupBorder: {
    style: 'medium',
    color: '333333',
  },
};

export const defaultAppSettings: AppSettings = {
  timezone: 'Asia/Tokyo',
  excel: defaultExcelSettings,
  outputFormat: 'excel',
};

let cachedConfig: AppSettings | null = null;

export function loadAppSettings(): AppSettings {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // 設定ファイルから読み込み
    const configModule = require('../clockify.config');
    const config: AppConfig = configModule.default || configModule;

    cachedConfig = {
      timezone: config.timezone,
      excel: {
        headerColor: config.excel.headerColor,
        alternateRowColor: config.excel.alternateRowColor,
        borderStyle: config.excel.borderStyle,
        fontSize: config.excel.fontSize,
        fontName: config.excel.fontName,
        dateGroupBorder: config.excel.dateGroupBorder || defaultExcelSettings.dateGroupBorder,
        showDescription: config.excel.showDescription ?? false,
      },
      outputFormat: config.outputFormat ?? 'excel',
    };
  } catch {
    // 設定ファイルがない場合はデフォルト設定を使用
    console.warn('clockify.config.ts が見つかりません。デフォルト設定を使用します。');
    cachedConfig = defaultAppSettings;
  }

  return cachedConfig;
}

export function loadExcelSettings(): ExcelSettings {
  return loadAppSettings().excel;
}

/** 設定キャッシュをクリア（テスト用） */
export function clearConfigCache(): void {
  cachedConfig = null;
}
