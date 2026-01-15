import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HookConfig {
  matcher: string;
  hooks: Array<{
    command: string;
    timeout?: number;
    type: "command";
  }>;
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ActiveSkill {
  name: string;
  type: "slash" | "skill";
  args?: string[];
}

export interface GlobalSettings {
  env?: Record<string, string>;
  language?: string;
  mcpServers?: Record<string, MCPServerConfig>;
  hooks?: Record<string, HookConfig[]>;
  enabledPlugins?: Record<string, boolean>;
  activeSkills?: ActiveSkill[];
  systemPrompt?: string;
  alwaysThinkingEnabled?: boolean;
}

export interface ParsedSettings {
  env: Record<string, string>;
  mcp: Map<string, MCPServerConfig>;
  hooks: Map<string, HookConfig[]>;
  plugins: Map<string, PluginConfig>;
  language: string;
  activeSkills: ActiveSkill[];
  systemPrompt: string;
  alwaysThinkingEnabled: boolean;
}

export class SettingsManager {
  private static instance: SettingsManager | null = null;
  private settings: ParsedSettings;
  private settingsPath: string;

  private constructor() {
    this.settingsPath = join(homedir(), ".claude", "settings.json");
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (SettingsManager.instance === null) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private loadSettings(): ParsedSettings {
    let rawSettings: GlobalSettings = {};

    if (existsSync(this.settingsPath)) {
      try {
        const content = readFileSync(this.settingsPath, "utf8");
        rawSettings = JSON.parse(content) as GlobalSettings;
      } catch {
        console.warn(`[SettingsManager] Failed to load settings from ${this.settingsPath}`);
      }
    }

    return {
      env: rawSettings.env || {},
      mcp: new Map(Object.entries(rawSettings.mcpServers || {})),
      hooks: this.parseHooks(rawSettings.hooks || {}),
      plugins: this.parsePlugins(rawSettings.enabledPlugins || {}),
      language: rawSettings.language || "English",
      activeSkills: rawSettings.activeSkills || [],
      systemPrompt: rawSettings.systemPrompt || "",
      alwaysThinkingEnabled: rawSettings.alwaysThinkingEnabled || false
    };
  }

  private parseHooks(hooks: Record<string, HookConfig[]>): Map<string, HookConfig[]> {
    const parsed = new Map<string, HookConfig[]>();
    for (const [event, eventHooks] of Object.entries(hooks)) {
      parsed.set(event, eventHooks);
    }
    return parsed;
  }

  private parsePlugins(enabledPlugins: Record<string, boolean>): Map<string, PluginConfig> {
    const parsed = new Map<string, PluginConfig>();
    for (const [name, enabled] of Object.entries(enabledPlugins)) {
      parsed.set(name, { name, enabled });
    }
    return parsed;
  }

  getEnv(): Record<string, string> {
    return { ...this.settings.env };
  }

  getLanguage(): string {
    return this.settings.language;
  }

  setLanguage(lang: string): void {
    this.settings.language = lang;
  }

  getMCPServers(): Map<string, MCPServerConfig> {
    return new Map(this.settings.mcp);
  }

  getHooks(event: string): HookConfig[] {
    return this.settings.hooks.get(event) || [];
  }

  getAllHooks(): Map<string, HookConfig[]> {
    return new Map(this.settings.hooks);
  }

  getEnabledPlugins(): Map<string, PluginConfig> {
    return new Map(this.settings.plugins);
  }

  getActiveSkills(): ActiveSkill[] {
    return [...this.settings.activeSkills];
  }

  addActiveSkill(skill: ActiveSkill): boolean {
    if (this.settings.activeSkills.some(s => s.name === skill.name)) {
      return false;
    }
    this.settings.activeSkills.push(skill);
    return true;
  }

  removeActiveSkill(skillName: string): boolean {
    const index = this.settings.activeSkills.findIndex(s => s.name === skillName);
    if (index === -1) {
      return false;
    }
    this.settings.activeSkills.splice(index, 1);
    return true;
  }

  hasActiveSkill(skillName: string): boolean {
    return this.settings.activeSkills.some(s => s.name === skillName);
  }

  getSystemPrompt(): string {
    return this.settings.systemPrompt;
  }

  setSystemPrompt(prompt: string): void {
    this.settings.systemPrompt = prompt;
  }

  isAlwaysThinkingEnabled(): boolean {
    return this.settings.alwaysThinkingEnabled;
  }

  setAlwaysThinkingEnabled(enabled: boolean): void {
    this.settings.alwaysThinkingEnabled = enabled;
  }

  reload(): void {
    this.settings = this.loadSettings();
  }

  getSettingsPath(): string {
    return this.settingsPath;
  }

  getRawSettings(): ParsedSettings {
    return { ...this.settings };
  }

  static resetInstance(): void {
    SettingsManager.instance = null;
  }
}

export const settingsManager = SettingsManager.getInstance();
