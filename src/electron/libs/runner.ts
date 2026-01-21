import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";

import { getCurrentApiConfig, buildEnvForConfig, getClaudeCodePath} from "./claude-settings.js";
import { getEnhancedEnv } from "./util.js";


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

/**
 * 检测是否是删除操作
 * @param toolName 工具名称
 * @param input 工具输入参数
 * @returns 是否是删除操作
 */
function checkIfDeletionOperation(toolName: string, input: unknown): boolean {
  // Bash 工具需要检查命令内容
  if (toolName === "Bash" && input && typeof input === "object") {
    const cmd = (input as Record<string, unknown>).command;
    if (typeof cmd === "string") {
      // 检测删除命令
      const deletionPatterns = [
        /\brm\s/,           // Unix rm 命令
        /\brmdir\s/,        // Unix rmdir 命令
        /del\s/,            // Windows del 命令
        /rmdir\s/,          // Windows rmdir 命令
        /Delete-Item/,      // PowerShell
        /\bunlink\s/,       // unlink 系统调用
        /\btrash\s/,        // trash 命令
        /shred\s/,          // 安全删除
        /wipe\s/,           // wipe 工具
      ];
      return deletionPatterns.some(pattern => pattern.test(cmd));
    }
  }

  // Write 工具 - 检查是否写入空内容（可能是删除操作）
  if (toolName === "Write" && input && typeof input === "object") {
    const writeInput = input as Record<string, unknown>;
    const content = writeInput.content;
    // 如果内容为空或很短，可能是删除操作
    if (typeof content === "string" && content.trim().length === 0) {
      return true;
    }
  }

  return false;
}


export async function runClaude(options: RunnerOptions): Promise<RunnerHandle> {
  const { prompt, session, resumeSessionId, onEvent, onSessionUpdate } = options;
  const abortController = new AbortController();

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
      // 获取当前配置
      const config = getCurrentApiConfig();
      
      if (!config) {
        onEvent({
          type: "session.status",
          payload: { sessionId: session.id, status: "error", title: session.title, cwd: session.cwd, error: "API configuration not found. Please configure API settings." }
        });
        return;
      }
      
      // 使用 Anthropic SDK
      const env = buildEnvForConfig(config);
      const mergedEnv = {
        ...getEnhancedEnv(),
        ...env
      };
      
      const q = query({
        prompt,
        options: {
          cwd: session.cwd ?? DEFAULT_CWD,
          resume: resumeSessionId,
          abortController,
          env: mergedEnv,
          pathToClaudeCodeExecutable: getClaudeCodePath(),
          permissionMode: "default",
          includePartialMessages: true,
          canUseTool: async (toolName, input, { signal }) => {
            // 检测删除操作 - 需要用户确认
            const isDeletionOperation = checkIfDeletionOperation(toolName, input);

            // 记录所有工具调用（使用 info 级别确保输出）
            const { log } = await import("../logger.js");
            log.info(`[Tool] toolName=${toolName}, isDeletion=${isDeletionOperation}`);
            if (toolName === "Bash") {
              const cmd = (input as Record<string, unknown>).command;
              log.info(`[Tool] Bash command: ${cmd}`);
            }
            if (toolName === "Write") {
              const filePath = (input as Record<string, unknown>).path;
              const content = (input as Record<string, unknown>).content;
              log.info(`[Tool] Write file=${filePath}, contentLength=${String(content).length}`);
            }

            // AskUserQuestion 或删除操作都需要用户响应
            if (toolName === "AskUserQuestion" || isDeletionOperation) {
              const toolUseId = crypto.randomUUID();

              // 发送权限请求到前端
              sendPermissionRequest(toolUseId, toolName, input);

              // 创建一个 Promise，等待用户响应
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

                // 处理中止
                signal.addEventListener("abort", () => {
                  session.pendingPermissions.delete(toolUseId);
                  resolve({ behavior: "deny", message: "Session aborted" });
                });
              });
            }

            // 自动批准其他工具
            return { behavior: "allow", updatedInput: input };
          }
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

        // 拦截工具使用消息 - 检测删除操作
        if (message.type === "assistant") {
          const assistantMsg = message as any;
          if (assistantMsg.message && assistantMsg.message.content) {
            for (const content of assistantMsg.message.content) {
              if (content.type === "tool_use" && content.name === "Bash") {
                const cmd = content.input?.command;
                if (cmd && checkIfDeletionOperation("Bash", { command: cmd })) {
                  // 这是一个删除操作，需要用户确认
                  const { log } = await import("../logger.js");
                  log.info(`[Deletion Detected] Blocking tool use: ${cmd}`);
                  // TODO: 在这里拦截，阻止工具执行
                  // 目前 SDK 已经执行了工具，所以我们无法拦截
                }
              }
            }
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
