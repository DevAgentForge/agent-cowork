import { useCallback, useEffect, useRef } from "react";
import type { ClientEvent } from "../types";
import { useAppStore } from "../store/useAppStore";

const MAX_ROWS = 12;
const LINE_HEIGHT = 21;
const MAX_HEIGHT = MAX_ROWS * LINE_HEIGHT;

interface PromptInputProps {
  sendEvent: (event: ClientEvent) => void;
}

export function usePromptActions(sendEvent: (event: ClientEvent) => void) {
  const prompt = useAppStore((state) => state.prompt);
  const cwd = useAppStore((state) => state.cwd);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const selectedProviderId = useAppStore((state) => state.selectedProviderId);
  const sessionConfig = useAppStore((state) => state.sessionConfig);
  const setPrompt = useAppStore((state) => state.setPrompt);
  const setPendingStart = useAppStore((state) => state.setPendingStart);
  const setGlobalError = useAppStore((state) => state.setGlobalError);

  const activeSession = activeSessionId ? sessions[activeSessionId] : undefined;
  const isRunning = activeSession?.status === "running";

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) return;

    if (!activeSessionId) {
      let title = "";
      try {
        setPendingStart(true);
        title = await window.electron.generateSessionTitle(prompt);
      } catch (error) {
        console.error(error);
        setPendingStart(false);
        setGlobalError("Failed to get session title.");
        return;
      }

      // Use session configuration from store
      // - permissionMode: "secure" | "free" (controls bypass permissions)
      // - allowedTools: comma-separated list of allowed tools (empty = all allowed)
      sendEvent({
        type: "session.start",
        payload: {
          title,
          prompt,
          cwd: cwd.trim() || undefined,
          allowedTools: sessionConfig.allowedTools || undefined,
          providerId: selectedProviderId || undefined,
          permissionMode: sessionConfig.permissionMode
        }
      });
    } else {
      if (activeSession?.status === "running") {
        setGlobalError("Session is still running. Please wait for it to finish.");
        return;
      }
      sendEvent({
        type: "session.continue",
        payload: { sessionId: activeSessionId, prompt, providerId: selectedProviderId || undefined }
      });
    }
    setPrompt("");
  }, [activeSession, activeSessionId, cwd, prompt, selectedProviderId, sessionConfig, sendEvent, setGlobalError, setPendingStart, setPrompt]);

  const handleStop = useCallback(() => {
    if (!activeSessionId) return;
    sendEvent({ type: "session.stop", payload: { sessionId: activeSessionId } });
  }, [activeSessionId, sendEvent]);

  const handleStartFromModal = useCallback(() => {
    if (!cwd.trim()) {
      setGlobalError("Working Directory is required to start a session.");
      return;
    }
    handleSend();
  }, [cwd, handleSend, setGlobalError]);

  return { prompt, setPrompt, isRunning, handleSend, handleStop, handleStartFromModal };
}

export function PromptInput({ sendEvent }: PromptInputProps) {
  const { prompt, setPrompt, isRunning, handleSend, handleStop } = usePromptActions(sendEvent);
  const sessionConfig = useAppStore((state) => state.sessionConfig);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const heightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPromptLengthRef = useRef<number>(0);

  const isFreeMode = sessionConfig.permissionMode === "free";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (isRunning) { handleStop(); return; }
    handleSend();
  };

  const adjustHeight = useCallback((target: HTMLTextAreaElement) => {
    target.style.height = "auto";
    const scrollHeight = target.scrollHeight;
    if (scrollHeight > MAX_HEIGHT) {
      target.style.height = `${MAX_HEIGHT}px`;
      target.style.overflowY = "auto";
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = "hidden";
    }
  }, []);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;

    // Clear any pending height adjustment
    if (heightTimeoutRef.current) {
      clearTimeout(heightTimeoutRef.current);
    }

    // Debounce height calculation (~1 frame at 60fps)
    heightTimeoutRef.current = setTimeout(() => {
      adjustHeight(target);
    }, 16);
  };

  // Handle programmatic prompt changes (e.g., clear after send)
  useEffect(() => {
    if (!promptRef.current) return;

    // Only adjust if prompt length changed significantly (programmatic change)
    const lengthDiff = Math.abs(prompt.length - lastPromptLengthRef.current);
    if (lengthDiff > 10 || prompt.length === 0) {
      adjustHeight(promptRef.current);
    }
    lastPromptLengthRef.current = prompt.length;
  }, [prompt, adjustHeight]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (heightTimeoutRef.current) {
        clearTimeout(heightTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent pb-6 px-2 lg:pb-8 pt-8 lg:ml-[280px]">
      <div className={`mx-auto flex w-full max-w-full items-end gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-card lg:max-w-3xl ${
        isFreeMode ? "border-warning/30" : "border-ink-900/10"
      }`}>
        {/* Free mode indicator */}
        {isFreeMode && (
          <div className="flex items-center gap-1.5 text-warning shrink-0" title="Free Mode: Tools execute without approval">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        <textarea
          rows={1}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-800 placeholder:text-muted focus:outline-none"
          placeholder={isFreeMode ? "Free mode: Tools execute without approval..." : "Describe what you want agent to handle..."}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          ref={promptRef}
        />
        <button
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            isRunning
              ? "bg-error text-white hover:bg-error/90"
              : isFreeMode
                ? "bg-warning text-white hover:bg-warning/90"
                : "bg-accent text-white hover:bg-accent-hover"
          }`}
          onClick={isRunning ? handleStop : handleSend}
          aria-label={isRunning ? "Stop session" : "Send prompt"}
        >
          {isRunning ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L16 12l-9.8 1.4-2.8 7.2Z" fill="currentColor" /></svg>
          )}
        </button>
      </div>
    </section>
  );
}
