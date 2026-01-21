import { BrowserWindow } from "electron";
import type { ClientEvent, ServerEvent } from "./types.js";
import { runClaude, type RunnerHandle } from "./libs/runner.js";
import { SessionStore } from "./libs/session-store.js";
import { app } from "electron";
import { join } from "path";
import { log } from "./logger.js";

let sessions: SessionStore;
const runnerHandles = new Map<string, RunnerHandle>();

function initializeSessions() {
  if (!sessions) {
    const DB_PATH = join(app.getPath("userData"), "sessions.db");
    log.info(`Initializing session store at: ${DB_PATH}`);
    sessions = new SessionStore(DB_PATH);
  }
  return sessions;
}

function broadcast(event: ServerEvent) {
  const payload = JSON.stringify(event);
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send("server-event", payload);
  }
}

function hasLiveSession(sessionId: string): boolean {
  if (!sessions) return false;
  return Boolean(sessions.getSession(sessionId));
}

function emit(event: ServerEvent) {
  // If a session was deleted, drop late events that would resurrect it in the UI.
  // (Session history lookups are DB-backed, so these late events commonly lead to "Unknown session".)
  if (
    (event.type === "session.status" ||
      event.type === "stream.message" ||
      event.type === "stream.user_prompt" ||
      event.type === "permission.request") &&
    !hasLiveSession(event.payload.sessionId)
  ) {
    return;
  }

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
  // Initialize sessions on first event
  const sessions = initializeSessions();

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
      // Session may have been deleted (or deleted concurrently). Treat as a sync event rather than an error toast.
      emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
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
    const cwd = event.payload.cwd;
    log.session('unknown', 'Starting new session', { cwd, title: event.payload.title });
    const startTime = Date.now();

    const session = sessions.createSession({
      cwd,
      title: event.payload.title,
      allowedTools: event.payload.allowedTools,
      prompt: event.payload.prompt
    });

    // 使用会话日志记录到任务文件夹（如果有 cwd）
    if (cwd) {
      log.sessionCwd(session.id, cwd, 'Session created', { id: session.id, cwd, title: session.title });
      log.sessionCwd(session.id, cwd, 'Session starting', { prompt: event.payload.prompt });
    } else {
      log.session(session.id, 'Session created (no cwd)', { id: session.id, title: session.title });
    }

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
        const duration = Date.now() - startTime;
        log.performance(`Session ${session.id} start`, duration);
      })
      .catch((error) => {
        log.error(`Session ${session.id} failed to start`, error);
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
      emit({ type: "session.deleted", payload: { sessionId: event.payload.sessionId } });
      emit({
        type: "runner.error",
        payload: { sessionId: event.payload.sessionId, message: "Session no longer exists." }
      });
      return;
    }

    // If session has no claudeSessionId, treat this as the first prompt
    // (The session object exists but hasn't been initialized with Claude yet)
    if (!session.claudeSessionId) {
      log.session(session.id, 'Starting session (no claudeSessionId)', { title: session.title });
      const startTime = Date.now();

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
          const duration = Date.now() - startTime;
          log.performance(`Session ${session.id} start`, duration);
        })
        .catch((error) => {
          log.error(`Session ${session.id} failed to start`, error);
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
    if (!session) {
      log.warn(`Attempted to stop non-existent session: ${event.payload.sessionId}`);
      return;
    }

    log.session(session.id, 'Stopping session');

    const handle = runnerHandles.get(session.id);
    if (handle) {
      handle.abort();
      runnerHandles.delete(session.id);
      log.session(session.id, 'Session aborted');
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
    log.session(sessionId, 'Deleting session');

    try {
      const handle = runnerHandles.get(sessionId);
      if (handle) {
        handle.abort();
        runnerHandles.delete(sessionId);
      }

      sessions.deleteSession(sessionId);
      emit({
        type: "session.deleted",
        payload: { sessionId }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to delete session ${sessionId}`, error);

      emit({
        type: "runner.error",
        payload: {
          sessionId,
          message: `Failed to delete session: ${errorMessage}`
        }
      });
    }
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
}

export function cleanupAllSessions(): void {
  const count = runnerHandles.size;
  if (count > 0) {
    log.info(`Cleaning up ${count} active session(s)`);
    for (const [sessionId, handle] of runnerHandles) {
      log.session(sessionId, 'Aborting during cleanup');
      handle.abort();
    }
  }
  runnerHandles.clear();
  if (sessions) {
    sessions.close();
    log.info('Session store closed');
  }
}

export { sessions };
