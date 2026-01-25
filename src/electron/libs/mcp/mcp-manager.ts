/**
 * MCP 配置管理器
 * 负责 MCP Server 配置的管理（启动由 Claude SDK 自动处理）
 */

import { EventEmitter } from "events";
import {
    MCPServerConfig,
    MCPConfigState,
    MCPConfigChangeEvent,
} from "./mcp-config.js";
import { loadMCPConfig, saveMCPConfig, getEnabledServers } from "./mcp-store.js";

/** MCP Manager 事件类型 */
export interface MCPManagerEvents {
    "config-changed": (event: MCPConfigChangeEvent) => void;
}

/**
 * MCP 配置管理器
 * 单例模式，管理 MCP Server 配置
 * 注意：Server 进程由 Claude SDK 自动启动和管理
 */
export class MCPManager extends EventEmitter {
    private static instance: MCPManager | null = null;

    /** 当前配置 */
    private config: MCPConfigState;

    private constructor() {
        super();
        this.config = loadMCPConfig();
    }

    /** 获取单例实例 */
    public static getInstance(): MCPManager {
        if (!MCPManager.instance) {
            MCPManager.instance = new MCPManager();
        }
        return MCPManager.instance;
    }

    /** 重置实例（主要用于测试） */
    public static resetInstance(): void {
        MCPManager.instance = null;
    }

    /** 获取当前配置 */
    public getConfig(): MCPConfigState {
        return this.config;
    }

    /** 重新加载配置 */
    public reloadConfig(): void {
        this.config = loadMCPConfig();
    }

    /** 保存配置 */
    public saveConfig(): void {
        saveMCPConfig(this.config);
    }

    /** 更新配置 */
    public updateConfig(newConfig: MCPConfigState): void {
        this.config = newConfig;
        this.saveConfig();
        this.emit("config-changed", { type: "config-updated" });
    }

    /** 获取已启用的 Servers */
    public getEnabledServers(): MCPServerConfig[] {
        return getEnabledServers(this.config);
    }

    /**
     * 构建用于 Claude SDK 的 MCP Servers 配置
     * 返回格式符合 SDK 的 mcpServers 选项
     */
    public buildSDKConfig(): Record<string, {
        type?: 'stdio';
        command: string;
        args?: string[];
        env?: Record<string, string>
    }> {
        const mcpServers: Record<string, {
            type?: 'stdio';
            command: string;
            args?: string[];
            env?: Record<string, string>
        }> = {};

        for (const server of this.config.servers) {
            if (!server.enabled) continue;

            // 只支持 stdio 类型
            if (server.transportType !== 'stdio') {
                console.log(`[mcp-manager] Skipping server ${server.id}: unsupported transport type ${server.transportType}`);
                continue;
            }

            mcpServers[server.id] = {
                type: 'stdio',
                command: server.command,
                args: server.args,
                env: server.env,
            };

            console.log(`[mcp-manager] Configured server: ${server.id} (${server.name})`);
        }

        return mcpServers;
    }
}

/** 导出单例获取函数 */
export function getMCPManager(): MCPManager {
    return MCPManager.getInstance();
}
