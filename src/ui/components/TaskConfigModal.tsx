import { useState } from "react";
import type { ThinkModeConfig } from "../store/useAppStore";

interface TaskConfigModalProps {
  folder: string;
  description: string;
  mode: "secure" | "free" | "auto";
  thinkMode: ThinkModeConfig;
  systemPrompt: string;
  appendSystemPrompt: boolean;
  preloadedSkills: string[];
  availableSkills: string[];
  availableCommands: Array<{ name: string; type: string; description: string }>;
  onSave: (config: {
    folder: string;
    description: string;
    mode: "secure" | "free" | "auto";
    thinkMode: ThinkModeConfig;
    systemPrompt?: string;
    appendSystemPrompt?: boolean;
    preloadedSkills: string[];
  }) => void;
  onCancel: () => void;
}

export function TaskConfigModal({
  folder,
  description,
  mode,
  thinkMode,
  systemPrompt,
  appendSystemPrompt,
  preloadedSkills,
  availableSkills,
  availableCommands,
  onSave,
  onCancel
}: TaskConfigModalProps) {
  const [localFolder, setLocalFolder] = useState(folder);
  const [localDescription, setLocalDescription] = useState(description);
  const [localMode, setLocalMode] = useState(mode);
  const [localThinkEnabled, setLocalThinkEnabled] = useState(thinkMode.enabled);
  const [localThinkMode, setLocalThinkMode] = useState<"continuous" | "on-demand">(
    thinkMode.enabled && thinkMode.mode ? thinkMode.mode : "continuous"
  );
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localAppendSystemPrompt, setLocalAppendSystemPrompt] = useState(appendSystemPrompt);
  const [localPreloadedSkills, setLocalPreloadedSkills] = useState<string[]>(preloadedSkills);

  const handleSelectDirectory = async () => {
    const result = await window.electron.selectDirectory();
    if (result) setLocalFolder(result);
  };

  const handleSkillToggle = (skillName: string) => {
    setLocalPreloadedSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  const handleSave = () => {
    onSave({
      folder: localFolder,
      description: localDescription,
      mode: localMode,
      thinkMode: localThinkEnabled
        ? { enabled: true, mode: localThinkMode }
        : { enabled: false },
      systemPrompt: localSystemPrompt || undefined,
      appendSystemPrompt: localAppendSystemPrompt,
      preloadedSkills: localPreloadedSkills
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ink-900/5 bg-surface p-6 shadow-elevated">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-ink-800">Configure Task</div>
          <button
            className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors"
            onClick={onCancel}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Configure task-specific settings for the agent.</p>

        <div className="mt-5 grid gap-5">
          {/* Folder */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Project Folder</span>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder="/path/to/project"
                value={localFolder}
                onChange={(e) => setLocalFolder(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary transition-colors"
              >
                Browse...
              </button>
            </div>
          </label>

          {/* Description */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Description</span>
            <input
              type="text"
              className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              placeholder="Describe this task..."
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
            />
          </label>

          {/* Permission Mode */}
          <div className="grid gap-2">
            <span className="text-xs font-medium text-muted">Permission Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {(["secure", "free", "auto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                    localMode === m
                      ? "border-accent/60 bg-accent/10 text-ink-800"
                      : "border-ink-900/10 bg-surface text-muted hover:border-ink-900/20 hover:text-ink-700"
                  }`}
                  onClick={() => setLocalMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Think Mode */}
          <div className="rounded-xl border border-ink-900/10 bg-surface-secondary p-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-ink-800">Always Thinking Mode</span>
                <p className="text-xs text-muted mt-0.5">Enable continuous thinking for complex tasks</p>
              </div>
              <button
                type="button"
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  localThinkEnabled ? "bg-accent" : "bg-ink-900/20"
                }`}
                onClick={() => setLocalThinkEnabled(!localThinkEnabled)}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    localThinkEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            {localThinkEnabled && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["continuous", "on-demand"] as const).map((tm) => (
                  <button
                    key={tm}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-xs capitalize transition-colors ${
                      localThinkMode === tm
                        ? "border-accent/60 bg-accent/10 text-ink-800"
                        : "border-ink-900/10 bg-surface text-muted hover:border-ink-900/20"
                    }`}
                    onClick={() => setLocalThinkMode(tm)}
                  >
                    {tm.replace("-", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* System Prompt */}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">System Prompt (optional)</span>
            <textarea
              rows={4}
              className="rounded-xl border border-ink-900/10 bg-surface-secondary p-3 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
              placeholder="E.g., You are a security expert..."
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={localAppendSystemPrompt}
                onChange={(e) => setLocalAppendSystemPrompt(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-ink-900/20 text-accent focus:ring-accent/20"
              />
              <span>Append to global prompt (if unchecked, replaces global)</span>
            </label>
          </label>

          {/* Skills Preload */}
          <div className="rounded-xl border border-ink-900/10 bg-surface-secondary p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted">Preload Skills as System Prompts</span>
              <span className="text-[10px] text-muted-light">{localPreloadedSkills.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSkills.length > 0 ? (
                availableSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      localPreloadedSkills.includes(skill)
                        ? "border-accent/60 bg-accent/10 text-ink-800"
                        : "border-ink-900/10 bg-surface text-muted hover:border-ink-900/20"
                    }`}
                  >
                    <span className="font-medium">{skill}</span>
                    {localPreloadedSkills.includes(skill) && (
                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted">No skills available. Add skills in settings.</span>
              )}
            </div>
          </div>

          {/* Available Commands Reference */}
          {availableCommands.length > 0 && (
            <div className="rounded-xl border border-ink-900/10 bg-surface-secondary p-4">
              <span className="text-xs font-medium text-muted">Available Commands</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableCommands.slice(0, 10).map((cmd) => (
                  <span
                    key={cmd.name}
                    className="rounded-lg border border-ink-900/10 bg-surface px-2 py-1 text-xs text-muted"
                  >
                    /{cmd.name}
                  </span>
                ))}
                {availableCommands.length > 10 && (
                  <span className="text-xs text-muted-light">+{availableCommands.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-ink-900/10 bg-surface px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-tertiary transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSave}
              disabled={!localFolder.trim()}
            >
              Save Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
