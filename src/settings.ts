export interface ExcelSettings {
  headerColor: string;
  alternateRowColor?: string;
  borderStyle: 'thin' | 'medium' | 'thick';
  fontSize: number;
  fontName: string;
  dateGroupBorder: {
    style: 'thin' | 'medium' | 'thick';
    color: string;
  };
}

export interface AppSettings {
  timezone: string;
  excel: ExcelSettings;
}

export const defaultExcelSettings: ExcelSettings = {
  headerColor: '4472C4', // 青色
  alternateRowColor: 'F2F2F2', // 薄いグレー
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
};

export function loadAppSettings(): AppSettings {
  const excelSettings = {
    headerColor: process.env.EXCEL_HEADER_COLOR || defaultExcelSettings.headerColor,
    alternateRowColor:
      process.env.EXCEL_ALTERNATE_ROW_COLOR || defaultExcelSettings.alternateRowColor,
    borderStyle:
      (process.env.EXCEL_BORDER_STYLE as 'thin' | 'medium' | 'thick') ||
      defaultExcelSettings.borderStyle,
    fontSize: parseInt(process.env.EXCEL_FONT_SIZE || '') || defaultExcelSettings.fontSize,
    fontName: process.env.EXCEL_FONT_NAME || defaultExcelSettings.fontName,
    dateGroupBorder: {
      style:
        (process.env.EXCEL_DATE_BORDER_STYLE as 'thin' | 'medium' | 'thick') ||
        defaultExcelSettings.dateGroupBorder.style,
      color: process.env.EXCEL_DATE_BORDER_COLOR || defaultExcelSettings.dateGroupBorder.color,
    },
  };

  return {
    timezone: process.env.TIMEZONE || defaultAppSettings.timezone,
    excel: excelSettings,
  };
}

export function loadExcelSettings(): ExcelSettings {
  return loadAppSettings().excel;
}
