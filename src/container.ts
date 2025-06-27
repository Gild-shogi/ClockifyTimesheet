import { ConfigurationService } from './services/configurationService';
import { ClockifyTimeTrackingClient } from './services/clockifyTimeTrackingClient';
import { TimeEntryDataProcessor } from './services/dataProcessor';
import { ExcelTimesheetGenerator } from './services/excelTimesheetGenerator';
import { TimesheetService } from './services/timesheetService';
import {
  IConfigurationService,
  ITimeTrackingClient,
  IDataProcessor,
  ITimesheetGenerator,
  ITimesheetService,
} from './interfaces';

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
    this.timesheetGenerator = new ExcelTimesheetGenerator(this.configurationService);
    this.timesheetService = new TimesheetService(
      this.timeTrackingClient,
      this.dataProcessor,
      this.timesheetGenerator
    );
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