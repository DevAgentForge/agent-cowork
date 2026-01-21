type Statistics = {
    cpuUsage: number;
    ramUsage: number;
    storageData: number;
}

type StaticData = {
    totalStorage: number;
    cpuModel: string;
    totalMemoryGB: number;
}

type UnsubscribeFunction = () => void;

type EventPayloadMapping = {
    statistics: Statistics;
    getStaticData: StaticData;
    "generate-session-title": string;
    "get-recent-cwds": string[];
    "select-directory": string | null;
    "get-api-config": { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null;
    "save-api-config": { success: boolean; error?: string };
    "check-api-config": { hasConfig: boolean; config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null };
    "test-api-connection": { success: boolean; message: string; details?: string; responseTime?: number };
}

interface Window {
    electron: {
        subscribeStatistics: (callback: (statistics: Statistics) => void) => UnsubscribeFunction;
        getStaticData: () => Promise<StaticData>;
        // Claude Agent IPC APIs
        sendClientEvent: (event: any) => void;
        onServerEvent: (callback: (event: any) => void) => UnsubscribeFunction;
        generateSessionTitle: (userInput: string | null) => Promise<string>;
        getRecentCwds: (limit?: number) => Promise<string[]>;
        selectDirectory: () => Promise<string | null>;
        getApiConfig: () => Promise<{ apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null>;
        saveApiConfig: (config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" }) => Promise<{ success: boolean; error?: string }>;
        checkApiConfig: () => Promise<{ hasConfig: boolean; config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null }>;
        testApiConnection: (config: { apiKey: string; baseURL: string; model: string }) => Promise<{ success: boolean; message: string; details?: string; responseTime?: number }>;
    }
}
