import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// ============================================================
// Nuevos tipos para Enhanced Orchestrator
// ============================================================

export type Language = "English" | "Español" | "Français" | "Deutsch" | "中文" | "日本語" | "Português";

export type ThinkModeConfig =
  | { enabled: false }
  | { enabled: true; mode: "continuous" | "on-demand"; maxReasoningTokens?: number };

export interface TaskSystemPrompt {
  content: string;
  append?: boolean;
  role?: "developer" | "user";
}

export interface SystemPromptLayer {
  id: string;
  content: string;
  priority: number;
  source: "task" | "skill" | "global" | "user";
  append: boolean;
  role?: "developer" | "user";
}

export interface TaskConfig {
  folder: string;
  description: string;
  mode: "secure" | "free" | "auto";
  thinkMode: ThinkModeConfig;
  systemPrompt?: TaskSystemPrompt;
  preloadedSkills?: string[];
}

export interface TaskDefinition {
  id: string;
  name: string;
  config: TaskConfig;
  metadata: { createdAt: number; createdBy?: string; tags?: string[] };
}

export interface TaskCollection {
  version: string;
  tasks: TaskDefinition[];
  defaults: { thinkMode: ThinkModeConfig; systemPrompt?: string; preloadedSkills: string[] };
}

export interface OrchestratorConfig {
  language: Language;
  systemPrompt?: string;
  activeSkills: string[];
  alwaysThinking: boolean;
  mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
}

// ============================================================
// Tipos existentes
// ============================================================

export type ClaudeSettingsEnv = {
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  ANTHROPIC_MODEL: string;
  API_TIMEOUT_MS: string;
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
};

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
};

export type StreamMessage = SDKMessage | UserPromptMessage;

export type SessionStatus = "idle" | "running" | "completed" | "error";

export type PermissionMode = "secure" | "free";

export type SessionInfo = {
  id: string;
  title: string;
  status: SessionStatus;
  claudeSessionId?: string;
  cwd?: string;
  permissionMode?: PermissionMode;
  createdAt: number;
  updatedAt: number;
};

// Server -> Client events
export type ServerEvent =
  | { type: "stream.message"; payload: { sessionId: string; message: StreamMessage } }
  | { type: "stream.user_prompt"; payload: { sessionId: string; prompt: string } }
  | { type: "session.status"; payload: { sessionId: string; status: SessionStatus; title?: string; cwd?: string; error?: string } }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | { type: "session.history"; payload: { sessionId: string; status: SessionStatus; messages: StreamMessage[] } }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | { type: "permission.request"; payload: { sessionId: string; toolUseId: string; toolName: string; input: unknown } }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } };

// Client -> Server events
export type ClientEvent =
  | {
      type: "session.start";
      payload: { title: string; prompt: string; cwd?: string; allowedTools?: string; permissionMode?: PermissionMode };
    }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | { type: "permission.response"; payload: { sessionId: string; toolUseId: string; result: PermissionResult } }
  // Enhanced Orchestrator events
  | { type: "settings.update"; payload: { language?: Language; alwaysThinking?: boolean; systemPrompt?: string } }
  | { type: "command.parse"; payload: { input: string } }
  | { type: "skill.add"; payload: { skillName: string; type: "slash" | "skill" } }
  | { type: "skill.remove"; payload: { skillName: string } }
  | { type: "task.apply"; payload: { taskId: string } }
  | { type: "orchestrator.configure"; payload: { language?: Language; injectSkills?: boolean; systemPromptAddition?: string } };

// Extension of ServerEvent for orchestrator
export type OrchestratorServerEvent = ServerEvent
  | { type: "command.parsed"; payload: { input: string; command: string; args: string[]; isUnified: boolean; exists: boolean } }
  | { type: "settings.loaded"; payload: { language: Language; alwaysThinking: boolean; activeSkills: string[] } }
  | { type: "skill.list"; payload: { skills: Array<{ name: string; type: string; description: string }> } }
  | { type: "task.applied"; payload: { taskId: string; config: TaskConfig } };

