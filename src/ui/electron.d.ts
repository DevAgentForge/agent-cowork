export interface ApiConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  apiType?: string;
}

export interface TestApiResult {
  success: boolean;
  message: string;
  details?: string;
  responseTime?: number;
}

export interface ElectronAPI {
  subscribeStatistics: (callback: (stats: any) => void) => () => void;
  getStaticData: () => Promise<any>;
  sendClientEvent: (event: any) => void;
  onServerEvent: (callback: (event: any) => void) => () => void;
  generateSessionTitle: (userInput: string | null) => Promise<string>;
  getRecentCwds: (limit?: number) => Promise<string[]>;
  selectDirectory: () => Promise<string | null>;
  getApiConfig: () => Promise<ApiConfig | null>;
  saveApiConfig: (config: ApiConfig) => Promise<{ success: boolean; error?: string }>;
  checkApiConfig: () => Promise<{ hasConfig: boolean; config: ApiConfig | null }>;
  testApiConnection: (config: ApiConfig) => Promise<TestApiResult>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
