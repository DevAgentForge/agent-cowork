import { BrowserWindow } from "electron";
import type { ClientEvent, ServerEvent } from "./types.js";
import { runClaude, type RunnerHandle } from "./libs/runner.js";
import { SessionStore } from "./libs/session-store.js";
import { app } from "electron";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
// Enhanced Orchestrator imports
import { settingsManager } from "./libs/settings-manager.js";
import { unifiedCommandParser } from "./libs/unified-commands.js";
import { unifiedTaskRunner } from "./libs/unified-task-runner.js";

const DB_PATH = join(app.getPath("userData"), "sessions.db");
const sessions = new SessionStore(DB_PATH);
const runnerHandles = new Map<string, RunnerHandle>();

function broadcast<T>(event: T) {
  const payload = JSON.stringify(event);
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send("server-event", payload);
  }
}

function emit(event: ServerEvent) {
  if (event.type === "session.status") {
    sessions.updateSession(event.payload.sessionId, { status: event.payload.status });
  }
  if (event.type === "stream.message") {
    sessions.recordMessage(event.payload.sessionId, event.payload.message);
  }
  if (event.type === "stream.user_prompt") {
    sessions.recordMessage(event.payload.sessionId, {
      type: "user_prompt",
      prompt: event.payload.prompt
    });
  }
  broadcast(event);
}

export function handleClientEvent(event: ClientEvent) {
  if (event.type === "session.list") {
    emit({
      type: "session.list",
      payload: { sessions: sessions.listSessions() }
    });
    return;
  }

  if (event.type === "session.history") {
    const history = sessions.getSessionHistory(event.payload.sessionId);
    if (!history) {
      emit({
        type: "runner.error",
        payload: { message: "Unknown session" }
      });
      return;
    }
    emit({
      type: "session.history",
      payload: {
        sessionId: history.session.id,
        status: history.session.status,
        messages: history.messages
      }
    });
    return;
  }

  if (event.type === "session.start") {
    const session = sessions.createSession({
      cwd: event.payload.cwd,
      title: event.payload.title,
      allowedTools: event.payload.allowedTools,
      permissionMode: event.payload.permissionMode,
      prompt: event.payload.prompt
    });

    sessions.updateSession(session.id, {
      status: "running",
      lastPrompt: event.payload.prompt
    });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
    });

    emit({
      type: "stream.user_prompt",
      payload: { sessionId: session.id, prompt: event.payload.prompt }
    });

    runClaude({
      prompt: event.payload.prompt,
      session,
      resumeSessionId: session.claudeSessionId,
      onEvent: emit,
      onSessionUpdate: (updates) => {
        sessions.updateSession(session.id, updates);
      }
    })
      .then((handle) => {
        runnerHandles.set(session.id, handle);
        sessions.setAbortController(session.id, undefined);
      })
      .catch((error) => {
        sessions.updateSession(session.id, { status: "error" });
        emit({
          type: "session.status",
          payload: {
            sessionId: session.id,
            status: "error",
            title: session.title,
            cwd: session.cwd,
            error: String(error)
          }
        });
      });

    return;
  }

  if (event.type === "session.continue") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) {
      emit({
        type: "runner.error",
        payload: { message: "Unknown session" }
      });
      return;
    }

    if (!session.claudeSessionId) {
      emit({
        type: "runner.error",
        payload: { sessionId: session.id, message: "Session has no resume id yet." }
      });
      return;
    }

    sessions.updateSession(session.id, { status: "running", lastPrompt: event.payload.prompt });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "running", title: session.title, cwd: session.cwd }
    });

    emit({
      type: "stream.user_prompt",
      payload: { sessionId: session.id, prompt: event.payload.prompt }
    });

    runClaude({
      prompt: event.payload.prompt,
      session,
      resumeSessionId: session.claudeSessionId,
      onEvent: emit,
      onSessionUpdate: (updates) => {
        sessions.updateSession(session.id, updates);
      }
    })
      .then((handle) => {
        runnerHandles.set(session.id, handle);
      })
      .catch((error) => {
        sessions.updateSession(session.id, { status: "error" });
        emit({
          type: "session.status",
          payload: {
            sessionId: session.id,
            status: "error",
            title: session.title,
            cwd: session.cwd,
            error: String(error)
          }
        });
      });

    return;
  }

  if (event.type === "session.stop") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const handle = runnerHandles.get(session.id);
    if (handle) {
      handle.abort();
      runnerHandles.delete(session.id);
    }

    sessions.updateSession(session.id, { status: "idle" });
    emit({
      type: "session.status",
      payload: { sessionId: session.id, status: "idle", title: session.title, cwd: session.cwd }
    });
    return;
  }

  if (event.type === "session.delete") {
    const sessionId = event.payload.sessionId;
    const handle = runnerHandles.get(sessionId);
    if (handle) {
      handle.abort();
      runnerHandles.delete(sessionId);
    }

    // Always try to delete and emit deleted event
    // Don't emit error if session doesn't exist - it may have already been deleted
    sessions.deleteSession(sessionId);
    emit({
      type: "session.deleted",
      payload: { sessionId }
    });
    return;
  }

  if (event.type === "permission.response") {
    const session = sessions.getSession(event.payload.sessionId);
    if (!session) return;

    const pending = session.pendingPermissions.get(event.payload.toolUseId);
    if (pending) {
      pending.resolve(event.payload.result);
    }
    return;
  }

  // ============================================================
  // Enhanced Orchestrator Event Handlers
  // ============================================================

  if (event.type === "settings.update") {
    // Update language setting
    if (event.payload.language) {
      settingsManager.setLanguage(event.payload.language);
    }
    // Update alwaysThinking setting
    if (event.payload.alwaysThinking !== undefined) {
      settingsManager.setAlwaysThinkingEnabled(event.payload.alwaysThinking);
    }
    // Update system prompt
    if (event.payload.systemPrompt !== undefined) {
      settingsManager.setSystemPrompt(event.payload.systemPrompt);
    }

    // Broadcast settings.loaded event (don't record in session history)
    broadcast({
      type: "settings.loaded",
      payload: {
        language: settingsManager.getLanguage(),
        alwaysThinking: settingsManager.isAlwaysThinkingEnabled(),
        activeSkills: settingsManager.getActiveSkills().map(s => s.name)
      }
    });
    return;
  }

  if (event.type === "command.parse") {
    const parsed = unifiedCommandParser.parse(event.payload.input);
    const command = unifiedCommandParser.getCommand(parsed.command);

    // Broadcast command.parsed event
    broadcast({
      type: "command.parsed",
      payload: {
        input: parsed.raw,
        command: parsed.command,
        args: parsed.args,
        isUnified: parsed.isUnified,
        exists: !!command
      }
    });
    return;
  }

  if (event.type === "skill.add") {
    const { skillName, type } = event.payload;
    settingsManager.addActiveSkill({ name: skillName, type });
    unifiedCommandParser.registerSkill({ name: skillName, type });

    // Broadcast updated skill list
    broadcast({
      type: "skill.list",
      payload: {
        skills: settingsManager.getActiveSkills().map(s => ({
          name: s.name,
          type: s.type,
          description: `Skill: ${s.name}`
        }))
      }
    });
    return;
  }

  if (event.type === "skill.remove") {
    const { skillName } = event.payload;
    settingsManager.removeActiveSkill(skillName);
    unifiedCommandParser.unregisterSkill(skillName);
    return;
  }

  if (event.type === "task.apply") {
    const { taskId } = event.payload;

    // Load task collection from user data
    const taskCollectionPath = join(app.getPath("userData"), "task-collection.json");

    try {
      if (existsSync(taskCollectionPath)) {
        const content = readFileSync(taskCollectionPath, "utf-8");
        const taskCollection = JSON.parse(content);

        const task = taskCollection.tasks?.find((t: { id: string }) => t.id === taskId);
        if (task) {
          unifiedTaskRunner.configureTask(task.config);
          broadcast({
            type: "task.applied",
            payload: { taskId, config: task.config }
          });
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to load task collection:", error);
    }

    // Fallback: emit error if task not found
    emit({
      type: "runner.error",
      payload: { message: `Task not found: ${taskId}` }
    });
    return;
  }

  if (event.type === "orchestrator.configure") {
    const { language, injectSkills, systemPromptAddition } = event.payload;

    // Configure orchestrator options
    const options: Record<string, unknown> = {};
    if (language) options.language = language;
    if (injectSkills !== undefined) options.injectSkills = injectSkills;
    if (systemPromptAddition) options.systemPromptAddition = systemPromptAddition;

    // Broadcast configuration confirmation
    broadcast({
      type: "settings.loaded",
      payload: {
        language: settingsManager.getLanguage(),
        alwaysThinking: settingsManager.isAlwaysThinkingEnabled(),
        activeSkills: settingsManager.getActiveSkills().map(s => s.name)
      }
    });
    return;
  }
}

export { sessions };
