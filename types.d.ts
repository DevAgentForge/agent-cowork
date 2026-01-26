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

type MCPServerStatus = "running" | "stopped" | "error" | "starting";

type MCPServerInfo = {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    isBuiltin?: boolean;
    builtinType?: string;
    browserMode?: "visible" | "headless";
    status: MCPServerStatus;
    errorMessage?: string;
}

type EventPayloadMapping = {
    statistics: Statistics;
    getStaticData: StaticData;
    "generate-session-title": string;
    "get-recent-cwds": string[];
    "select-directory": string | null;
    "get-api-config": { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null;
    "save-api-config": { success: boolean; error?: string };
    "check-api-config": { hasConfig: boolean; config: { apiKey: string; baseURL: string; model: string; apiType?: "anthropic" } | null };
    // MCP APIs
    "mcp-get-servers": MCPServerInfo[];
    "mcp-enable-server": { success: boolean };
    "mcp-disable-server": { success: boolean };
    "mcp-enable-browser-automation": { success: boolean };
    "mcp-add-server": { success: boolean; serverId: string };
    "mcp-update-server": { success: boolean };
    "mcp-delete-server": { success: boolean };
}

type MCPServerFormData = {
    name: string;
    description?: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    transportType: "stdio" | "sse";
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
        // MCP APIs
        getMCPServers: () => Promise<MCPServerInfo[]>;
        enableMCPServer: (serverId: string) => Promise<{ success: boolean }>;
        disableMCPServer: (serverId: string) => Promise<{ success: boolean }>;
        enableBrowserAutomation: () => Promise<{ success: boolean }>;
        addMCPServer: (config: MCPServerFormData) => Promise<{ success: boolean; serverId: string }>;
        updateMCPServer: (serverId: string, config: Partial<MCPServerFormData>) => Promise<{ success: boolean }>;
        deleteMCPServer: (serverId: string) => Promise<{ success: boolean }>;
        onMCPStatusChange: (callback: (serverId: string, status: MCPServerStatus, error?: string) => void) => UnsubscribeFunction;
    }
}
