
export enum ServiceStatus {
  OPERATIONAL = 'ok',
  SLOW = 'slow',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
}

export interface StatusUpdate {
  status: string;
  service: string;
  timestamp: number;
}

export interface HourlyStatus {
  hour: number;
  dateStr: string;
  status: ServiceStatus;
  lastChecked: number;
  responseTime: number;
}

export interface DailyStatus {
  dateStr: string;
  status: ServiceStatus;
  uptimePercentage: number;
}

export interface StatusHistory {
  timestamp: number;
  responseTime: number;
  status: ServiceStatus;
}
