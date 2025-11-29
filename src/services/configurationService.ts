import { IConfigurationService } from '../interfaces';
import { loadAppSettings } from '../settings';

export class ConfigurationService implements IConfigurationService {
  private appSettings = loadAppSettings();

  getTimezone(): string {
    return this.appSettings.timezone;
  }

  getClockifyConfig() {
    const apiKey = process.env.CLOCKIFY_API_KEY;
    const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID;
    const userId = process.env.CLOCKIFY_USER_ID;

    if (!apiKey || !workspaceId || !userId) {
      throw new Error(
        'Clockify configuration is incomplete. Please set CLOCKIFY_API_KEY, CLOCKIFY_WORKSPACE_ID, and CLOCKIFY_USER_ID environment variables.'
      );
    }

    return {
      apiKey,
      workspaceId,
      userId,
    };
  }

  getExcelSettings() {
    return this.appSettings.excel;
  }

  getOutputFormat(): 'excel' | 'csv' | 'googleSheets' {
    return this.appSettings.outputFormat;
  }

  getGoogleSheetsConfig() {
    return this.appSettings.googleSheets;
  }
}
