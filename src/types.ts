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
}

export interface WorkDay {
  date: string;
  dayOfWeek: string;
  sessions: WorkSession[];
}
