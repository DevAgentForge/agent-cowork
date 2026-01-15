import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";
import type { PermissionMode } from "../types.js";

export type RunnerOptions = {
  prompt: string;
  session: Session;
  resumeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: Partial<Session>) => void;
};

export type RunnerHandle = {
  abort: () => void;
};

const DEFAULT_CWD = process.cwd();

export function parseAllowedTools(allowedTools?: string): Set<string> | null {
  if (allowedTools === undefined || allowedTools === null) return null;
  const items = allowedTools
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean)
    .map((tool) => tool.toLowerCase());
  return new Set(items);
}

export function isToolAllowed(toolName: string, allowedTools: Set<string> | null): boolean {
  if (toolName === "AskUserQuestion") return true;
  if (!allowedTools) return true;
  return allowedTools.has(toolName.toLowerCase());
}

type PermissionRequestContext = {
  session: Session;
  sendPermissionRequest: (toolUseId: string, toolName: string, input: unknown) => void;
  permissionMode: PermissionMode;
  allowedTools: Set<string> | null;
};

export function createCanUseTool({
  session,
  sendPermissionRequest,
  permissionMode,
  allowedTools
}: PermissionRequestContext) {
  return async (toolName: string, input: unknown, { signal }: { signal: AbortSignal }) => {
    const isAskUserQuestion = toolName === "AskUserQuestion";

    if (!isAskUserQuestion && permissionMode === "free") {
      return { behavior: "allow", updatedInput: input } as PermissionResult;
    }

    if (!isToolAllowed(toolName, allowedTools)) {
      return {
        behavior: "deny",
        message: `Tool ${toolName} is not allowed by allowedTools`
      } as PermissionResult;
    }

    const toolUseId = crypto.randomUUID();
    sendPermissionRequest(toolUseId, toolName, input);

    return new Promise<PermissionResult>((resolve) => {
      session.pendingPermissions.set(toolUseId, {
        toolUseId,
        toolName,
        input,
        resolve: (result) => {
          session.pendingPermissions.delete(toolUseId);
          resolve(result as PermissionResult);
        }
      });

      signal.addEventListener("abort", () => {
        session.pendingPermissions.delete(toolUseId);
        resolve({ behavior: "deny", message: "Session aborted" });
      });
    });
  };
}

export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const abortController = new AbortController();
  const permissionMode = session.permissionMode ?? "secure";
  const allowedTools = parseAllowedTools(session.allowedTools);

  const sendMessage = (message: SDKMessage) => {
    onEvent({
      type: "stream.message",
      payload: { sessionId: session.id, message }
    });
  };

  const sendPermissionRequest = (toolUseId: string, toolName: string, input: unknown) => {
    onEvent({
      type: "permission.request",
      payload: { sessionId: session.id, toolUseId, toolName, input }
    });
  };

  // Start the query in the background
  (async () => {
    try {
      const canUseTool = createCanUseTool({
        session,
        sendPermissionRequest,
        permissionMode,
        allowedTools
      });
      const q = query({
        prompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          resume: resumeSessionId,
          abortController,
          env: { ...process.env },
          includePartialMessages: true,
          ...(permissionMode === "free"
            ? { permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true }
            : {}),
          canUseTool
        }
      });

      // Capture session_id from init message
      for await (const message of q) {
        // Extract session_id from system init message
        if (message.type === "system" && "subtype" in message && message.subtype === "init") {
          const sdkSessionId = message.session_id;
          if (sdkSessionId) {
            session.claudeSessionId = sdkSessionId;
            onSessionUpdate?.({ claudeSessionId: sdkSessionId });
          }
        }

        // Send message to frontend
        sendMessage(message);

        // Check for result to update session status
        if (message.type === "result") {
          const status = message.subtype === "success" ? "completed" : "error";
          onEvent({
            type: "session.status",
            payload: { sessionId: session.id, status, title: session.title }
          });
        }
      }

      // Query completed normally
      if (session.status === "running") {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "completed", title: session.title }
        });
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // Session was aborted, don't treat as error
        return;
      }
      onEvent({
        type: "session.status",
        payload: { sessionId: session.id, status: "error", title: session.title, error: String(error) }
      });
    }
  })();

  return {
    abort: () => abortController.abort()
  };
}
