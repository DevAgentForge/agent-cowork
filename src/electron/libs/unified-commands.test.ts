import { describe, expect, it, beforeEach } from "vitest";
import { UnifiedCommandParser } from "./unified-commands.js";
import type { ActiveSkill } from "./settings-manager.js";

describe("UnifiedCommandParser", () => {
  let parser: UnifiedCommandParser;

  beforeEach(() => {
    parser = new UnifiedCommandParser();
  });

  describe("parse", () => {
    it("parses slash commands", () => {
      const result = parser.parse("/help");
      expect(result.command).toBe("help");
      expect(result.args).toEqual([]);
      expect(result.isUnified).toBe(true);
    });

    it("parses slash commands with arguments", () => {
      const result = parser.parse("/test arg1 arg2");
      expect(result.command).toBe("test");
      expect(result.args).toEqual(["arg1", "arg2"]);
      expect(result.isUnified).toBe(true);
    });

    it("handles empty input", () => {
      const result = parser.parse("");
      expect(result.command).toBe("");
      expect(result.args).toEqual([]);
      expect(result.isUnified).toBe(false);
    });

    it("handles whitespace-only input", () => {
      const result = parser.parse("   ");
      expect(result.command).toBe("");
      expect(result.isUnified).toBe(false);
    });

    it("handles regular prompts", () => {
      const result = parser.parse("Write a function");
      expect(result.command).toBe("Write");
      expect(result.args).toEqual(["a", "function"]);
      expect(result.isUnified).toBe(false);
    });

    it("preserves original raw input", () => {
      const raw = "/complex arg1 \"quoted arg\"";
      const result = parser.parse(raw);
      expect(result.raw).toBe(raw);
    });

    it("handles multiple spaces in arguments", () => {
      const result = parser.parse("/test    arg1    arg2");
      expect(result.command).toBe("test");
      expect(result.args).toEqual(["arg1", "arg2"]);
    });

    it("handles trailing spaces", () => {
      const result = parser.parse("/test arg1   ");
      expect(result.command).toBe("test");
      expect(result.args).toEqual(["arg1"]);
    });
  });

  describe("getCommand", () => {
    it("returns built-in help command", () => {
      const help = parser.getCommand("help");
      expect(help).toBeDefined();
      expect(help?.type).toBe("native");
      expect(help?.description).toBe("Show help information");
    });

    it("returns built-in exit command", () => {
      const exit = parser.getCommand("exit");
      expect(exit).toBeDefined();
      expect(exit?.type).toBe("native");
      expect(exit?.aliases).toContain("quit");
    });

    it("returns built-in clear command", () => {
      const clear = parser.getCommand("clear");
      expect(clear).toBeDefined();
      expect(clear?.type).toBe("native");
    });

    it("returns built-in status command", () => {
      const status = parser.getCommand("status");
      expect(status).toBeDefined();
      expect(status?.type).toBe("native");
    });

    it("returns undefined for unknown command", () => {
      const unknown = parser.getCommand("unknown");
      expect(unknown).toBeUndefined();
    });

    it("returns registered skill", () => {
      const skill: ActiveSkill = { name: "test-skill", type: "skill" };
      parser.registerSkill(skill);
      const result = parser.getCommand("test-skill");
      expect(result).toBeDefined();
      expect(result?.type).toBe("skill");
      expect(result?.name).toBe("test-skill");
    });

    it("returns registered slash skill", () => {
      const skill: ActiveSkill = { name: "typescript-guru", type: "slash" };
      parser.registerSkill(skill);
      const result = parser.getCommand("typescript-guru");
      expect(result).toBeDefined();
      expect(result?.type).toBe("slash");
    });

    it("is case-insensitive for built-in commands", () => {
      const help = parser.getCommand("HELP");
      expect(help).toBeDefined();
      expect(help?.name).toBe("help");
    });
  });

  describe("getAllCommands", () => {
    it("returns all built-in commands", () => {
      const commands = parser.getAllCommands();
      expect(commands).toHaveLength(4);
      expect(commands.some(c => c.name === "exit")).toBe(true);
      expect(commands.some(c => c.name === "clear")).toBe(true);
      expect(commands.some(c => c.name === "status")).toBe(true);
      expect(commands.some(c => c.name === "help")).toBe(true);
    });

    it("includes registered skills", () => {
      parser.registerSkill({ name: "skill1", type: "skill" });
      parser.registerSkill({ name: "skill2", type: "slash" });

      const commands = parser.getAllCommands();
      expect(commands.some(c => c.name === "skill1")).toBe(true);
      expect(commands.some(c => c.name === "skill2")).toBe(true);
    });

    it("returns empty array when no custom skills", () => {
      const commands = parser.getAllCommands();
      const customCommands = commands.filter(c =>
        c.type === "skill" || c.type === "slash"
      );
      expect(customCommands).toHaveLength(0);
    });
  });

  describe("registerSkill", () => {
    it("registers a new skill", () => {
      parser.registerSkill({ name: "new-skill", type: "skill" });
      const command = parser.getCommand("new-skill");
      expect(command).toBeDefined();
      expect(command?.type).toBe("skill");
    });

    it("allows registering multiple skills", () => {
      parser.registerSkill({ name: "skill1", type: "skill" });
      parser.registerSkill({ name: "skill2", type: "slash" });
      parser.registerSkill({ name: "skill3", type: "skill" });

      const allCommands = parser.getAllCommands();
      expect(allCommands.filter(c => c.type === "skill" || c.type === "slash")).toHaveLength(3);
    });

    it("skill with args is stored correctly", () => {
      const skill: ActiveSkill = { name: "test", type: "skill", args: ["--verbose"] };
      parser.registerSkill(skill);
      const command = parser.getCommand("test");
      expect(command?.name).toBe("test");
    });
  });

  describe("unregisterSkill", () => {
    it("removes a registered skill", () => {
      parser.registerSkill({ name: "remove-me", type: "skill" });
      parser.unregisterSkill("remove-me");
      const command = parser.getCommand("remove-me");
      expect(command).toBeUndefined();
    });

    it("does not affect other skills", () => {
      parser.registerSkill({ name: "skill1", type: "skill" });
      parser.registerSkill({ name: "skill2", type: "slash" });
      parser.unregisterSkill("skill1");

      const command1 = parser.getCommand("skill1");
      const command2 = parser.getCommand("skill2");
      expect(command1).toBeUndefined();
      expect(command2).toBeDefined();
    });

    it("does not affect built-in commands", () => {
      parser.unregisterSkill("help");
      const help = parser.getCommand("help");
      expect(help).toBeDefined();
    });

    it("handles unregistering non-existent skill gracefully", () => {
      expect(() => parser.unregisterSkill("non-existent")).not.toThrow();
    });
  });

  describe("isBuiltInCommand", () => {
    it("returns true for built-in commands", () => {
      expect(parser.isBuiltInCommand("help")).toBe(true);
      expect(parser.isBuiltInCommand("exit")).toBe(true);
      expect(parser.isBuiltInCommand("clear")).toBe(true);
      expect(parser.isBuiltInCommand("status")).toBe(true);
    });

    it("returns false for custom skills", () => {
      parser.registerSkill({ name: "custom", type: "skill" });
      expect(parser.isBuiltInCommand("custom")).toBe(false);
    });

    it("returns false for unknown commands", () => {
      expect(parser.isBuiltInCommand("unknown")).toBe(false);
    });
  });

  describe("clearCustomSkills", () => {
    it("removes all custom skills", () => {
      parser.registerSkill({ name: "skill1", type: "skill" });
      parser.registerSkill({ name: "skill2", type: "slash" });
      parser.clearCustomSkills();

      const allCommands = parser.getAllCommands();
      expect(allCommands.filter(c => c.type === "skill" || c.type === "slash")).toHaveLength(0);
    });

    it("keeps built-in commands", () => {
      parser.registerSkill({ name: "skill1", type: "skill" });
      parser.clearCustomSkills();

      const help = parser.getCommand("help");
      expect(help).toBeDefined();
    });
  });

  describe("command aliases", () => {
    it("help command has ? alias", () => {
      const help = parser.getCommand("help");
      expect(help?.aliases).toContain("?");
    });

    it("exit command has quit alias", () => {
      const exit = parser.getCommand("exit");
      expect(exit?.aliases).toContain("quit");
    });
  });

  describe("command types", () => {
    it("built-in commands are native type", () => {
      const commands = parser.getAllCommands().filter(c => c.type === "native");
      expect(commands).toHaveLength(4);
    });

    it("skills are skill or slash type", () => {
      parser.registerSkill({ name: "test-skill", type: "skill" });
      parser.registerSkill({ name: "test-slash", type: "slash" });

      const skill = parser.getCommand("test-skill");
      const slash = parser.getCommand("test-slash");

      expect(skill?.type).toBe("skill");
      expect(slash?.type).toBe("slash");
    });
  });
});
