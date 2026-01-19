import { useEffect, useState } from "react";
import { useAppStore, SESSION_PRESETS } from "../store/useAppStore";
import type { PermissionMode } from "../types";

interface StartSessionModalProps {
  cwd: string;
  prompt: string;
  pendingStart: boolean;
  onCwdChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onStart: () => void;
  onClose: () => void;
}

/**
 * Available tools that can be restricted
 * These match the tools available in Claude Code SDK
 */
const AVAILABLE_TOOLS = [
  { id: "Read", name: "Read", description: "Read files" },
  { id: "Edit", name: "Edit", description: "Edit files" },
  { id: "Write", name: "Write", description: "Write new files" },
  { id: "Bash", name: "Bash", description: "Execute shell commands" },
  { id: "Glob", name: "Glob", description: "Find files by pattern" },
  { id: "Grep", name: "Grep", description: "Search file contents" },
  { id: "Task", name: "Task", description: "Create subagent tasks" },
  { id: "WebFetch", name: "WebFetch", description: "Fetch web content" },
  { id: "TodoRead", name: "TodoRead", description: "Read TODO items" },
  { id: "TodoWrite", name: "TodoWrite", description: "Write TODO items" },
];

/**
 * MCP-related tools (shown separately as they require MCP configuration)
 */
const MCP_TOOLS = [
  { id: "mcp__*", name: "All MCP Tools", description: "All configured MCP servers" },
];

export function StartSessionModal({
  cwd,
  prompt,
  pendingStart,
  onCwdChange,
  onPromptChange,
  onStart,
  onClose
}: StartSessionModalProps) {
  const [recentCwds, setRecentCwds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof SESSION_PRESETS>("secure");

  // Session configuration from store
  const sessionConfig = useAppStore((s) => s.sessionConfig);
  const setPermissionMode = useAppStore((s) => s.setPermissionMode);
  const setAllowedTools = useAppStore((s) => s.setAllowedTools);
  const applyPreset = useAppStore((s) => s.applyPreset);

  // Parse allowed tools into a Set for checkbox state
  const allowedToolsSet = new Set(
    sessionConfig.allowedTools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  );

  useEffect(() => {
    window.electron.getRecentCwds().then(setRecentCwds).catch(console.error);
  }, []);

  const handleSelectDirectory = async () => {
    const result = await window.electron.selectDirectory();
    if (result) onCwdChange(result);
  };

  const handlePresetChange = (presetKey: keyof typeof SESSION_PRESETS) => {
    setSelectedPreset(presetKey);
    applyPreset(presetKey);
  };

  const handlePermissionModeChange = (mode: PermissionMode) => {
    setPermissionMode(mode);
    // Update preset selection based on mode
    if (mode === "free") {
      setSelectedPreset("free");
    } else if (mode === "secure" && sessionConfig.allowedTools === "") {
      setSelectedPreset("secure");
    } else {
      setSelectedPreset("restricted");
    }
  };

  const handleToolToggle = (toolId: string) => {
    const newSet = new Set(allowedToolsSet);
    if (newSet.has(toolId)) {
      newSet.delete(toolId);
    } else {
      newSet.add(toolId);
    }
    setAllowedTools(Array.from(newSet).join(","));

    // Update preset based on selection
    if (newSet.size === 0) {
      setSelectedPreset(sessionConfig.permissionMode === "free" ? "free" : "secure");
    } else {
      setSelectedPreset("restricted");
    }
  };

  const handleSelectAllTools = () => {
    const allToolIds = [...AVAILABLE_TOOLS, ...MCP_TOOLS].map((t) => t.id);
    setAllowedTools(allToolIds.join(","));
  };

  const handleClearAllTools = () => {
    setAllowedTools("");
    setSelectedPreset(sessionConfig.permissionMode === "free" ? "free" : "secure");
  };

  const isFreeMode = sessionConfig.permissionMode === "free";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/5 bg-surface p-6 shadow-elevated my-8">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-ink-800">Start Session</div>
          <button className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Create a new session to start interacting with agent.</p>

        <div className="mt-5 grid gap-4">
          {/* Working Directory */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Working Directory</span>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="/path/to/project"
                value={cwd}
                onChange={(e) => onCwdChange(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary transition-colors"
              >
                Browse...
              </button>
            </div>
            {recentCwds.length > 0 && (
              <div className="mt-2 grid gap-2 w-full">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-light">Recent</div>
                <div className="flex flex-wrap gap-2 w-full min-w-0">
                  {recentCwds.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className={`truncate rounded-full border px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${cwd === path ? "border-accent/60 bg-accent/10 text-ink-800" : "border-ink-900/10 bg-white text-muted hover:border-ink-900/20 hover:text-ink-700"}`}
                      onClick={() => onCwdChange(path)}
                      title={path}
                    >
                      {path}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </label>

          {/* Session Mode Presets */}
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Session Mode</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SESSION_PRESETS) as [keyof typeof SESSION_PRESETS, typeof SESSION_PRESETS[keyof typeof SESSION_PRESETS]][]).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetChange(key)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                    selectedPreset === key
                      ? key === "free" || key === "developer"
                        ? "border-warning/60 bg-warning/10"
                        : "border-accent/60 bg-accent/10"
                      : "border-ink-900/10 bg-surface hover:border-ink-900/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {key === "free" || key === "developer" ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-warning" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-ink-800">{preset.name}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Warning for Free Mode */}
          {isFreeMode && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-warning" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-warning-dark">Free Mode Warning</div>
                <p className="mt-0.5 text-xs text-muted">
                  All tools will execute without requiring approval. This is equivalent to running with <code className="rounded bg-ink-900/5 px-1">--dangerously-skip-permissions</code>. Only use this in trusted environments.
                </p>
              </div>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink-700 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
            Advanced Settings
          </button>

          {/* Advanced Settings Panel */}
          {showAdvanced && (
            <div className="grid gap-4 rounded-xl border border-ink-900/10 bg-surface-secondary p-4">
              {/* Permission Mode Toggle */}
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted">Permission Mode</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePermissionModeChange("secure")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      !isFreeMode
                        ? "border-accent/60 bg-accent/10 text-ink-800"
                        : "border-ink-900/10 bg-surface text-muted hover:text-ink-700"
                    }`}
                  >
                    Secure (Approval Required)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermissionModeChange("free")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isFreeMode
                        ? "border-warning/60 bg-warning/10 text-ink-800"
                        : "border-ink-900/10 bg-surface text-muted hover:text-ink-700"
                    }`}
                  >
                    Free (Bypass Permissions)
                  </button>
                </div>
              </div>

              {/* Tool Restrictions (only in secure mode) */}
              {!isFreeMode && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Allowed Tools</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllTools}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-muted">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllTools}
                        className="text-xs text-accent hover:text-accent-hover"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-light">
                    {allowedToolsSet.size === 0
                      ? "All tools allowed (with approval required for each)"
                      : `${allowedToolsSet.size} tool(s) allowed`}
                  </p>

                  {/* Core Tools */}
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TOOLS.map((tool) => (
                      <label
                        key={tool.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                          allowedToolsSet.has(tool.id) || allowedToolsSet.size === 0
                            ? "border-accent/40 bg-accent/5"
                            : "border-ink-900/10 bg-surface opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedToolsSet.has(tool.id) || allowedToolsSet.size === 0}
                          onChange={() => handleToolToggle(tool.id)}
                          className="rounded border-ink-900/20 text-accent focus:ring-accent/20"
                        />
                        <div>
                          <div className="text-xs font-medium text-ink-800">{tool.name}</div>
                          <div className="text-[10px] text-muted">{tool.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* MCP Tools Section */}
                  <div className="mt-2 pt-2 border-t border-ink-900/10">
                    <div className="text-xs font-medium text-muted mb-2">MCP Tools</div>
                    {MCP_TOOLS.map((tool) => (
                      <label
                        key={tool.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                          allowedToolsSet.has(tool.id) || allowedToolsSet.size === 0
                            ? "border-accent/40 bg-accent/5"
                            : "border-ink-900/10 bg-surface opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedToolsSet.has(tool.id) || allowedToolsSet.size === 0}
                          onChange={() => handleToolToggle(tool.id)}
                          className="rounded border-ink-900/20 text-accent focus:ring-accent/20"
                        />
                        <div>
                          <div className="text-xs font-medium text-ink-800">{tool.name}</div>
                          <div className="text-[10px] text-muted">{tool.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Prompt</span>
            <textarea
              rows={4}
              className="rounded-xl border border-ink-900/10 bg-surface-secondary p-3 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
              placeholder="Describe the task you want agent to handle..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
            />
          </label>

          {/* Start Button */}
          <button
            className={`flex flex-col items-center rounded-full px-5 py-3 text-sm font-medium text-white shadow-soft transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isFreeMode
                ? "bg-warning hover:bg-warning/90"
                : "bg-accent hover:bg-accent-hover"
            }`}
            onClick={onStart}
            disabled={pendingStart || !cwd.trim() || !prompt.trim()}
          >
            {pendingStart ? (
              <svg aria-hidden="true" className="w-5 h-5 animate-spin" viewBox="0 0 100 101" fill="none">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" opacity="0.3" />
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="white" />
              </svg>
            ) : isFreeMode ? (
              "Start Session (Free Mode)"
            ) : (
              "Start Session"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
