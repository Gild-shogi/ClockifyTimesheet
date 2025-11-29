import axios, { AxiosInstance } from 'axios';
import { IConfigurationService, ITimeTrackingClient } from '../interfaces';
import { Project, TimeEntry } from '../types';

export class ClockifyTimeTrackingClient implements ITimeTrackingClient {
  private httpClient: AxiosInstance;
  private workspaceId: string;
  private userId: string;

  constructor(private configService: IConfigurationService) {
    const config = this.configService.getClockifyConfig();
    this.workspaceId = config.workspaceId;
    this.userId = config.userId;

    this.httpClient = axios.create({
      baseURL: 'https://api.clockify.me/api/v1',
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]> {
    try {
      const response = await this.httpClient.get(
        `/workspaces/${this.workspaceId}/user/${this.userId}/time-entries`,
        {
          params: {
            start: startDate,
            end: endDate,
            'page-size': 5000,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch time entries: ${error}`);
    }
  }

  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.httpClient.get(`/workspaces/${this.workspaceId}/projects`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error}`);
    }
  }

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await this.httpClient.get(
        `/workspaces/${this.workspaceId}/projects/${projectId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch project ${projectId}: ${error}`);
    }
  }
}
