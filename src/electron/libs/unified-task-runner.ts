import { settingsManager } from "./settings-manager.js";

// Tipos locales (seran movidos a types.ts en FASE 6)
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

export interface EnhancedTaskContext {
  folder: string;
  description: string;
  mode: "secure" | "free" | "auto";
  thinkMode: ThinkModeConfig;
  systemPromptStack: SystemPromptLayer[];
  activeSkills: string[];
}

export class UnifiedTaskRunner {
  private taskContext: EnhancedTaskContext | null = null;

  configureTask(config: TaskConfig): void {
    this.taskContext = {
      folder: config.folder,
      description: config.description,
      mode: config.mode,
      thinkMode: config.thinkMode,
      systemPromptStack: this.buildSystemPromptStack(config),
      activeSkills: config.preloadedSkills || []
    };
  }

  private buildSystemPromptStack(config: TaskConfig): SystemPromptLayer[] {
    const stack: SystemPromptLayer[] = [];

    // 1. Global system prompt (settings.json)
    const globalPrompt = settingsManager.getSystemPrompt();
    if (globalPrompt) {
      stack.push({
        id: "global",
        content: globalPrompt,
        priority: 0,
        source: "global",
        append: true
      });
    }

    // 2. Task default system prompt
    if (config.systemPrompt) {
      stack.push({
        id: "task",
        content: config.systemPrompt.content,
        priority: 10,
        source: "task",
        append: config.systemPrompt.append ?? true,
        role: config.systemPrompt.role
      });
    }

    // 3. Skills como system prompts (preloaded)
    const activeSkills = settingsManager.getActiveSkills();
    for (const skill of activeSkills) {
      if (config.preloadedSkills?.includes(skill.name)) {
        stack.push({
          id: `skill-${skill.name}`,
          content: this.getSkillSystemPrompt(skill),
          priority: 20,
          source: "skill",
          append: true
        });
      }
    }

    return stack.sort((a, b) => a.priority - b.priority);
  }

  buildFinalSystemPrompt(): string {
    if (!this.taskContext || this.taskContext.systemPromptStack.length === 0) {
      return settingsManager.getSystemPrompt() || "";
    }

    const prompts = this.taskContext.systemPromptStack;
    let result = prompts[0].content;

    for (let i = 1; i < prompts.length; i++) {
      const layer = prompts[i];
      if (layer.append) {
        result += "\n\n" + layer.content;
      } else {
        result = layer.content;
      }
    }

    return result;
  }

  isThinkingEnabled(): boolean {
    if (!this.taskContext) {
      return settingsManager.isAlwaysThinkingEnabled();
    }
    return this.taskContext.thinkMode.enabled;
  }

  generateThinkingBlock(request: string): string | null {
    if (!this.isThinkingEnabled()) return null;
    const config = this.taskContext?.thinkMode;
    if (!config?.enabled) return null;

    if (config.mode === "continuous") {
      return `<thinking>\n${request}\n</thinking>`;
    }
    return null;
  }

  private getSkillSystemPrompt(skill: { name: string; type: string; args?: string[] }): string {
    return `[SKILL: ${skill.name}] You have access to ${skill.name} capabilities.`;
  }

  preparePrompt(userRequest: string): string {
    const parts: string[] = [];

    const systemPrompt = this.buildFinalSystemPrompt();
    if (systemPrompt) {
      parts.push(`[SYSTEM_PROMPT]\n${systemPrompt}\n[/SYSTEM_PROMPT]`);
    }

    const thinkingBlock = this.generateThinkingBlock(userRequest);
    if (thinkingBlock) parts.push(thinkingBlock);

    if (this.taskContext?.activeSkills.length) {
      parts.push(`[ACTIVE_SKILLS: ${this.taskContext.activeSkills.join(", ")}]`);
    }

    parts.push(`[USER_REQUEST]\n${userRequest}\n[/USER_REQUEST]`);

    return parts.join("\n\n");
  }

  clearContext(): void {
    this.taskContext = null;
  }

  getTaskContext(): EnhancedTaskContext | null {
    return this.taskContext;
  }

  hasTaskContext(): boolean {
    return this.taskContext !== null;
  }

  getActiveSkills(): string[] {
    return this.taskContext?.activeSkills || [];
  }

  getThinkMode(): ThinkModeConfig {
    if (!this.taskContext) {
      const enabled = settingsManager.isAlwaysThinkingEnabled();
      return enabled ? { enabled: true, mode: "continuous" } : { enabled: false };
    }
    return this.taskContext.thinkMode;
  }
}

export const unifiedTaskRunner = new UnifiedTaskRunner();
