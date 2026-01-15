import { create } from 'zustand';
import type { PermissionMode, ServerEvent, SessionStatus, StreamMessage } from "../types";

// Extended types for Orchestrator
export type Language = "English" | "Español" | "Français" | "Deutsch" | "中文" | "日本語" | "Português";

export type ThinkModeConfig =
  | { enabled: false }
  | { enabled: true; mode: "continuous" | "on-demand"; maxReasoningTokens?: number };

export type PermissionRequest = {
  toolUseId: string;
  toolName: string;
  input: unknown;
};

export type SessionView = {
  id: string;
  title: string;
  status: SessionStatus;
  cwd?: string;
  messages: StreamMessage[];
  permissionRequests: PermissionRequest[];
  lastPrompt?: string;
  createdAt?: number;
  updatedAt?: number;
  hydrated: boolean;
};

export type ActiveSkill = {
  name: string;
  type: "slash" | "skill";
  description?: string;
};

export type TaskConfig = {
  folder: string;
  description: string;
  mode: "secure" | "free" | "auto";
  thinkMode: ThinkModeConfig;
  systemPrompt?: string;
  appendSystemPrompt?: boolean;
  preloadedSkills: string[];
};

// Extended Orchestrator State
interface OrchestratorState {
  language: Language;
  alwaysThinking: boolean;
  systemPrompt: string;
  activeSkills: ActiveSkill[];
  taskConfigs: TaskConfig[];
  activeTaskId: string | null;
  availableCommands: Array<{ name: string; type: string; description: string }>;
}

// Combined App State
interface AppState extends OrchestratorState {
  sessions: Record<string, SessionView>;
  activeSessionId: string | null;
  prompt: string;
  cwd: string;
  permissionMode: PermissionMode;
  pendingStart: boolean;
  globalError: string | null;
  sessionsLoaded: boolean;
  showStartModal: boolean;
  historyRequested: Set<string>;

  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setShowStartModal: (show: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  markHistoryRequested: (sessionId: string) => void;
  resolvePermissionRequest: (sessionId: string, toolUseId: string) => void;
  handleServerEvent: (event: ServerEvent) => void;

  // Orchestrator actions
  setLanguage: (language: Language) => void;
  setAlwaysThinking: (enabled: boolean) => void;
  setSystemPrompt: (prompt: string) => void;
  addActiveSkill: (skill: ActiveSkill) => void;
  removeActiveSkill: (skillName: string) => void;
  addTaskConfig: (config: TaskConfig) => void;
  applyTaskConfig: (taskId: string) => void;
  setAvailableCommands: (commands: Array<{ name: string; type: string; description: string }>) => void;
}

function createSession(id: string): SessionView {
  return { id, title: "", status: "idle", messages: [], permissionRequests: [], hydrated: false };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Orchestrator state
  language: "English",
  alwaysThinking: false,
  systemPrompt: "",
  activeSkills: [],
  taskConfigs: [],
  activeTaskId: null,
  availableCommands: [],

  // Session state
  sessions: {},
  activeSessionId: null,
  prompt: "",
  cwd: "",
  permissionMode: "secure",
  pendingStart: false,
  globalError: null,
  sessionsLoaded: false,
  showStartModal: false,
  historyRequested: new Set(),

  setPrompt: (prompt) => set({ prompt }),
  setCwd: (cwd) => set({ cwd }),
  setPermissionMode: (permissionMode) => set({ permissionMode }),
  setPendingStart: (pendingStart) => set({ pendingStart }),
  setGlobalError: (globalError) => set({ globalError }),
  setShowStartModal: (showStartModal) => set({ showStartModal }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),

  // Orchestrator actions
  setLanguage: (language) => set({ language }),
  setAlwaysThinking: (alwaysThinking) => set({ alwaysThinking }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

  addActiveSkill: (skill) => set((state) => ({
    activeSkills: [...state.activeSkills, skill]
  })),

  removeActiveSkill: (skillName) => set((state) => ({
    activeSkills: state.activeSkills.filter(s => s.name !== skillName)
  })),

  addTaskConfig: (config) => set((state) => ({
    taskConfigs: [...state.taskConfigs, config]
  })),

  applyTaskConfig: (taskId) => set({ activeTaskId: taskId }),

  setAvailableCommands: (availableCommands) => set({ availableCommands }),

  markHistoryRequested: (sessionId) => {
    set((state) => {
      const next = new Set(state.historyRequested);
      next.add(sessionId);
      return { historyRequested: next };
    });
  },

  resolvePermissionRequest: (sessionId, toolUseId) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return {};
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            permissionRequests: existing.permissionRequests.filter(req => req.toolUseId !== toolUseId)
          }
        }
      };
    });
  },

  handleServerEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "session.list": {
        const nextSessions: Record<string, SessionView> = {};
        for (const session of event.payload.sessions) {
          const existing = state.sessions[session.id] ?? createSession(session.id);
          nextSessions[session.id] = {
            ...existing,
            status: session.status,
            title: session.title,
            cwd: session.cwd,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          };
        }

        set({ sessions: nextSessions, sessionsLoaded: true });

        const hasSessions = event.payload.sessions.length > 0;
        set({ showStartModal: !hasSessions });

        if (!hasSessions) {
          get().setActiveSessionId(null);
        }

        if (!state.activeSessionId && event.payload.sessions.length > 0) {
          const sorted = [...event.payload.sessions].sort((a, b) => {
            const aTime = a.updatedAt ?? a.createdAt ?? 0;
            const bTime = b.updatedAt ?? b.createdAt ?? 0;
            return aTime - bTime;
          });
          const latestSession = sorted[sorted.length - 1];
          if (latestSession) {
            get().setActiveSessionId(latestSession.id);
          }
        } else if (state.activeSessionId) {
          const stillExists = event.payload.sessions.some(
            (session) => session.id === state.activeSessionId
          );
          if (!stillExists) {
            get().setActiveSessionId(null);
          }
        }
        break;
      }

      case "session.history": {
        const { sessionId, messages, status } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, status, messages, hydrated: true }
            }
          };
        });
        break;
      }

      case "session.status": {
        const { sessionId, status, title, cwd } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                status,
                title: title ?? existing.title,
                cwd: cwd ?? existing.cwd,
                updatedAt: Date.now()
              }
            }
          };
        });

        if (state.pendingStart) {
          get().setActiveSessionId(sessionId);
          set({ pendingStart: false, showStartModal: false });
        }
        break;
      }

      case "session.deleted": {
        const { sessionId } = event.payload;
        const state = get();
        if (!state.sessions[sessionId]) break;
        const nextSessions = { ...state.sessions };
        delete nextSessions[sessionId];
        set({
          sessions: nextSessions,
          showStartModal: Object.keys(nextSessions).length === 0
        });
        if (state.activeSessionId === sessionId) {
          const remaining = Object.values(nextSessions).sort(
            (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
          );
          get().setActiveSessionId(remaining[0]?.id ?? null);
        }
        break;
      }

      case "stream.message": {
        const { sessionId, message } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...existing, messages: [...existing.messages, message] }
            }
          };
        });
        break;
      }

      case "stream.user_prompt": {
        const { sessionId, prompt } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                messages: [...existing.messages, { type: "user_prompt", prompt }]
              }
            }
          };
        });
        break;
      }

      case "permission.request": {
        const { sessionId, toolUseId, toolName, input } = event.payload;
        set((state) => {
          const existing = state.sessions[sessionId] ?? createSession(sessionId);
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...existing,
                permissionRequests: [...existing.permissionRequests, { toolUseId, toolName, input }]
              }
            }
          };
        });
        break;
      }

      case "runner.error": {
        set({ globalError: event.payload.message });
        break;
      }

      // ============================================================
      // Enhanced Orchestrator Event Handlers
      // ============================================================

      case "settings.loaded": {
        const { language, alwaysThinking, activeSkills } = event.payload;
        set({
          language: language as Language,
          alwaysThinking,
          activeSkills: activeSkills.map((name: string) => ({
            name,
            type: "skill" as const,
            description: `Skill: ${name}`
          }))
        });
        break;
      }

      case "command.parsed": {
        const { command, isUnified, exists } = event.payload;
        // Update available commands list based on parsed input
        if (isUnified && exists) {
          set((state) => {
            const existing = state.availableCommands.find(c => c.name === command);
            if (existing) return state;
            return {
              availableCommands: [...state.availableCommands, {
                name: command,
                type: "command",
                description: `Command: /${command}`
              }]
            };
          });
        }
        break;
      }

      case "skill.list": {
        const { skills } = event.payload;
        set({ activeSkills: skills as ActiveSkill[] });
        break;
      }

      case "task.applied": {
        const { taskId } = event.payload;
        set({ activeTaskId: taskId });
        break;
      }
    }
  }
}));
