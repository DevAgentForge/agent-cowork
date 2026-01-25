/**
 * MCP 工具列表面板组件
 * 展示 MCP Server 列表，支持一键启用浏览器自动化
 */

import { useEffect, useState, useCallback } from "react";
import { MCPServerForm } from "./MCPServerForm";
import { MCPErrorGuide, inferErrorType } from "./MCPErrorGuide";

/** MCP Server 状态 */
type MCPServerStatus = "running" | "stopped" | "error" | "starting";

/** MCP Server 信息 */
interface MCPServerInfo {
    id: string;
    name: string;
    description?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    transportType?: "stdio" | "sse";
    enabled: boolean;
    isBuiltin?: boolean;
    builtinType?: string;
    browserMode?: "visible" | "headless";
    status: MCPServerStatus;
    errorMessage?: string;
}

/** 状态指示器颜色映射 */
const STATUS_COLORS: Record<MCPServerStatus, string> = {
    running: "bg-success",
    stopped: "bg-ink-400",
    error: "bg-error",
    starting: "bg-warning",
};

/** 状态文本映射 */
const STATUS_TEXT: Record<MCPServerStatus, string> = {
    running: "运行中",
    stopped: "已停止",
    error: "错误",
    starting: "启动中",
};

export function MCPToolsPanel() {
    const [servers, setServers] = useState<MCPServerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingServer, setEditingServer] = useState<MCPServerInfo | null>(null);

    // 加载 MCP Server 列表
    const loadServers = useCallback(async () => {
        try {
            const result = await window.electron.getMCPServers();
            setServers(result);
            setError(null);
        } catch (err) {
            console.error("Failed to load MCP servers:", err);
            setError("加载 MCP 工具列表失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadServers();

        // 监听状态变化
        const unsubscribe = window.electron.onMCPStatusChange((serverId, status, errorMsg) => {
            setServers((prev) =>
                prev.map((s) =>
                    s.id === serverId
                        ? { ...s, status: status as MCPServerStatus, errorMessage: errorMsg }
                        : s
                )
            );
        });

        return unsubscribe;
    }, [loadServers]);

    // 启用/禁用 Server
    const handleToggleServer = async (serverId: string, enable: boolean) => {
        setActionLoading(serverId);
        try {
            if (enable) {
                await window.electron.enableMCPServer(serverId);
            } else {
                await window.electron.disableMCPServer(serverId);
            }
            await loadServers();
        } catch (err) {
            console.error(`Failed to ${enable ? "enable" : "disable"} server:`, err);
            setError(`${enable ? "启用" : "禁用"}失败: ${err}`);
        } finally {
            setActionLoading(null);
        }
    };

    // 一键启用浏览器自动化
    const handleEnableBrowserAutomation = async () => {
        setActionLoading("browser-automation");
        try {
            await window.electron.enableBrowserAutomation();
            await loadServers();
        } catch (err) {
            console.error("Failed to enable browser automation:", err);
            setError(`启用浏览器自动化失败: ${err}`);
        } finally {
            setActionLoading(null);
        }
    };

    // 添加新 Server
    const handleAddServer = async (data: {
        name: string;
        description?: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
        transportType: "stdio" | "sse";
    }) => {
        await window.electron.addMCPServer(data);
        await loadServers();
    };

    // 更新 Server
    const handleUpdateServer = async (serverId: string, data: {
        name: string;
        description?: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
        transportType: "stdio" | "sse";
    }) => {
        await window.electron.updateMCPServer(serverId, data);
        await loadServers();
    };

    // 删除 Server
    const handleDeleteServer = async (serverId: string) => {
        await window.electron.deleteMCPServer(serverId);
        await loadServers();
    };

    // 检查浏览器工具是否已添加
    const browserServer = servers.find((s) => s.builtinType === "playwright");
    const browserEnabled = browserServer?.enabled;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <svg aria-hidden="true" className="w-6 h-6 animate-spin text-accent" viewBox="0 0 100 101" fill="none">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" opacity="0.3" />
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 描述 */}
            <p className="text-sm text-muted">
                MCP (Model Context Protocol) 工具可以扩展 AI 助手的能力，让它能够执行更多操作。
            </p>

            {/* 浏览器自动化快捷启用卡片 */}
            {!browserEnabled && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-ink-800">浏览器自动化</span>
                                <span className="px-1.5 py-0.5 text-xs font-medium text-accent bg-accent/10 rounded">推荐</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                                启用后，AI 可以控制浏览器完成网页操作，如信息采集、自动填表等任务。
                            </p>
                            <button
                                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                                onClick={handleEnableBrowserAutomation}
                                disabled={actionLoading === "browser-automation"}
                            >
                                {actionLoading === "browser-automation" ? (
                                    <span className="flex items-center gap-2">
                                        <svg aria-hidden="true" className="w-4 h-4 animate-spin" viewBox="0 0 100 101" fill="none">
                                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" opacity="0.3" />
                                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="white" />
                                        </svg>
                                        启用中...
                                    </span>
                                ) : (
                                    "一键启用"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 错误提示 */}
            {error && (
                <div className="rounded-xl border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
                    {error}
                    <button
                        className="ml-2 underline hover:no-underline"
                        onClick={() => setError(null)}
                    >
                        关闭
                    </button>
                </div>
            )}

            {/* Server 列表 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-700">已配置的工具</span>
                    <button
                        className="text-xs text-accent hover:text-accent-hover transition-colors"
                        onClick={() => setShowAddForm(true)}
                    >
                        + 添加工具
                    </button>
                </div>

                {servers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-ink-900/10 bg-surface-secondary p-6 text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-ink-100 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <p className="mt-3 text-sm text-muted">还没有配置任何 MCP 工具</p>
                        <p className="mt-1 text-xs text-muted-light">点击上方「浏览器自动化」快速启用，或添加自定义工具</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {servers.map((server) => (
                            <div
                                key={server.id}
                                className="rounded-xl border border-ink-900/5 bg-surface-secondary p-4 hover:border-ink-900/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {/* 状态指示器 */}
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[server.status]} ${server.status === "starting" ? "animate-pulse" : ""
                                            }`}
                                        title={STATUS_TEXT[server.status]}
                                    />

                                    {/* Server 信息 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-ink-800 truncate">
                                                {server.name}
                                            </span>
                                            {server.isBuiltin && (
                                                <span className="px-1.5 py-0.5 text-xs text-muted bg-ink-100 rounded">
                                                    内置
                                                </span>
                                            )}
                                            <span className={`text-xs ${server.status === "running" ? "text-success" :
                                                server.status === "error" ? "text-error" :
                                                    "text-muted"
                                                }`}>
                                                {STATUS_TEXT[server.status]}
                                            </span>
                                        </div>
                                        {server.description && (
                                            <p className="mt-0.5 text-xs text-muted truncate">
                                                {server.description}
                                            </p>
                                        )}
                                        {server.status === "error" && server.errorMessage && (
                                            <p className="mt-1 text-xs text-error">
                                                {server.errorMessage}
                                            </p>
                                        )}
                                    </div>

                                    {/* 操作按钮 */}
                                    <div className="flex items-center gap-2">
                                        {/* 编辑按钮（非内置工具） */}
                                        {!server.isBuiltin && (
                                            <button
                                                className="p-1.5 text-muted hover:text-ink-700 hover:bg-surface-tertiary rounded-lg transition-colors"
                                                onClick={() => setEditingServer(server)}
                                                title="编辑"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* 启用/禁用开关 */}
                                        <button
                                            className={`
                        relative w-11 h-6 rounded-full transition-colors
                        ${server.enabled ? "bg-accent" : "bg-ink-200"}
                        ${actionLoading === server.id ? "opacity-50" : ""}
                      `}
                                            onClick={() => handleToggleServer(server.id, !server.enabled)}
                                            disabled={actionLoading === server.id}
                                            aria-label={server.enabled ? "禁用" : "启用"}
                                        >
                                            <span
                                                className={`
                          absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                          ${server.enabled ? "left-6" : "left-1"}
                        `}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 添加工具表单 */}
            {showAddForm && (
                <MCPServerForm
                    onClose={() => setShowAddForm(false)}
                    onSave={handleAddServer}
                />
            )}

            {/* 编辑工具表单 */}
            {editingServer && (
                <MCPServerForm
                    initialData={{
                        id: editingServer.id,
                        name: editingServer.name,
                        description: editingServer.description,
                        command: editingServer.command || "",
                        args: editingServer.args,
                        env: editingServer.env,
                        transportType: editingServer.transportType || "stdio",
                    }}
                    onClose={() => setEditingServer(null)}
                    onSave={(data) => handleUpdateServer(editingServer.id, data)}
                    onDelete={() => handleDeleteServer(editingServer.id)}
                />
            )}
        </div>
    );
}
