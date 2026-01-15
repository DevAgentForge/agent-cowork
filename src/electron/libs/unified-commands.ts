import type { ActiveSkill } from "./settings-manager.js";

export type CommandType = "slash" | "skill" | "native";

export interface UnifiedCommand {
  name: string;
  type: CommandType;
  description: string;
  aliases?: string[];
}

export interface ParsedInput {
  command: string;
  args: string[];
  raw: string;
  isUnified: boolean;
}

export class UnifiedCommandParser {
  private static builtInCommands: Map<string, UnifiedCommand> = new Map([
    ["exit", { name: "exit", type: "native", description: "End the current session", aliases: ["quit"] }],
    ["clear", { name: "clear", type: "native", description: "Clear the conversation history" }],
    ["status", { name: "status", type: "native", description: "Show current session status" }],
    ["help", { name: "help", type: "native", description: "Show help information", aliases: ["?"] }]
  ]);

  private customSkills: Map<string, ActiveSkill> = new Map();

  parse(input: string): ParsedInput {
    const trimmed = input.trim();
    if (!trimmed) return { command: "", args: [], raw: input, isUnified: false };

    if (trimmed.startsWith("/")) {
      const parts = trimmed.slice(1).split(/\s+/);
      return {
        command: parts[0].toLowerCase(),
        args: parts.slice(1),
        raw: input,
        isUnified: true
      };
    }

    return {
      command: trimmed.split(/\s+/)[0],
      args: trimmed.split(/\s+/).slice(1),
      raw: input,
      isUnified: false
    };
  }

  getCommand(name: string): UnifiedCommand | undefined {
    const lowerName = name.toLowerCase();
    const builtIn = UnifiedCommandParser.builtInCommands.get(lowerName);
    if (builtIn) return builtIn;

    // Try to find skill by exact name match
    const skill = this.customSkills.get(name);
    if (skill) {
      return {
        name: skill.name,
        type: skill.type === "slash" ? "slash" : "skill",
        description: `Skill: ${skill.name}`
      };
    }

    // Try to find skill by iterating (for case-insensitive match)
    for (const [skillName, skillValue] of this.customSkills) {
      if (skillName.toLowerCase() === lowerName) {
        return {
          name: skillValue.name,
          type: skillValue.type === "slash" ? "slash" : "skill",
          description: `Skill: ${skillValue.name}`
        };
      }
    }

    return undefined;
  }

  getAllCommands(): UnifiedCommand[] {
    const builtInCommands = Array.from(UnifiedCommandParser.builtInCommands.values());
    const customSkills = Array.from(this.customSkills.values()).map(skill => ({
      name: skill.name,
      type: skill.type === "slash" ? "slash" : "skill" as CommandType,
      description: `Skill: ${skill.name}`
    }));
    return [...builtInCommands, ...customSkills];
  }

  registerSkill(skill: ActiveSkill): void {
    this.customSkills.set(skill.name, skill);
  }

  unregisterSkill(name: string): void {
    this.customSkills.delete(name);
  }

  isBuiltInCommand(name: string): boolean {
    return UnifiedCommandParser.builtInCommands.has(name);
  }

  clearCustomSkills(): void {
    this.customSkills.clear();
  }
}

export const unifiedCommandParser = new UnifiedCommandParser();
