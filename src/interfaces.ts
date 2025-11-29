import { TimeEntry, Project, WorkDay } from './types';

export interface ITimeTrackingClient {
  getTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]>;
  getProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project>;
}

export interface ITimesheetGenerator {
  generateTimesheet(workDays: WorkDay[], year: number, month: number): Promise<string>;
}

export interface IDataProcessor {
  processTimeEntries(timeEntries: TimeEntry[], projects: Map<string, Project>): WorkDay[];
}

export interface IConfigurationService {
  getTimezone(): string;
  getClockifyConfig(): {
    apiKey: string;
    workspaceId: string;
    userId: string;
  };
  getExcelSettings(): {
    headerColor: string;
    alternateRowColor?: string;
    borderStyle: 'thin' | 'medium' | 'thick';
    fontSize: number;
    fontName: string;
    dateGroupBorder: {
      style: 'thin' | 'medium' | 'thick';
      color: string;
    };
    showDescription?: boolean;
  };
  getOutputFormat(): 'excel' | 'csv' | 'googleSheets';
  getGoogleSheetsConfig(): {
    spreadsheetId: string;
    credentialsPath: string;
  } | undefined;
}

export interface ITimesheetService {
  generateMonthlyTimesheet(year: number, month: number): Promise<string>;
}