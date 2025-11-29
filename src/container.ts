import {
  IConfigurationService,
  IDataProcessor,
  ITimeTrackingClient,
  ITimesheetGenerator,
  ITimesheetService,
} from './interfaces';
import { ClockifyTimeTrackingClient } from './services/clockifyTimeTrackingClient';
import { ConfigurationService } from './services/configurationService';
import { CsvTimesheetGenerator } from './services/csvTimesheetGenerator';
import { TimeEntryDataProcessor } from './services/dataProcessor';
import { ExcelTimesheetGenerator } from './services/excelTimesheetGenerator';
import { GoogleSheetsTimesheetGenerator } from './services/googleSheetsTimesheetGenerator';
import { TimesheetService } from './services/timesheetService';

/**
 * 依存性注入コンテナ
 * アプリケーションの依存関係を管理し、疎結合を実現します
 */
export class Container {
  private configurationService: IConfigurationService;
  private timeTrackingClient: ITimeTrackingClient;
  private dataProcessor: IDataProcessor;
  private timesheetGenerator: ITimesheetGenerator;
  private timesheetService: ITimesheetService;

  constructor() {
    // 依存関係の注入順序を管理
    this.configurationService = new ConfigurationService();
    this.timeTrackingClient = new ClockifyTimeTrackingClient(this.configurationService);
    this.dataProcessor = new TimeEntryDataProcessor(this.configurationService);

    // 出力形式に応じたジェネレーターを選択
    const outputFormat = this.configurationService.getOutputFormat();
    this.timesheetGenerator = this.createTimesheetGenerator(outputFormat);

    this.timesheetService = new TimesheetService(
      this.timeTrackingClient,
      this.dataProcessor,
      this.timesheetGenerator,
      this.configurationService
    );
  }

  private createTimesheetGenerator(format: 'excel' | 'csv' | 'googleSheets'): ITimesheetGenerator {
    switch (format) {
      case 'csv':
        return new CsvTimesheetGenerator(this.configurationService);
      case 'googleSheets': {
        const sheetsConfig = this.configurationService.getGoogleSheetsConfig();
        if (!sheetsConfig) {
          throw new Error(
            'Google Sheets設定が見つかりません。clockify.config.tsにgoogleSheets設定を追加してください。'
          );
        }
        return new GoogleSheetsTimesheetGenerator(this.configurationService, sheetsConfig);
      }
      default:
        return new ExcelTimesheetGenerator(this.configurationService);
    }
  }

  getConfigurationService(): IConfigurationService {
    return this.configurationService;
  }

  getTimeTrackingClient(): ITimeTrackingClient {
    return this.timeTrackingClient;
  }

  getDataProcessor(): IDataProcessor {
    return this.dataProcessor;
  }

  getTimesheetGenerator(): ITimesheetGenerator {
    return this.timesheetGenerator;
  }

  getTimesheetService(): ITimesheetService {
    return this.timesheetService;
  }
}
