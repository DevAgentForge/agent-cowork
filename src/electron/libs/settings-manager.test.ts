import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { SettingsManager } from "./settings-manager.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("SettingsManager", () => {
  const mockHomedir = "/mock/home";
  const mockSettingsPath = "/mock/home/.claude/settings.json";

  const mockSettings = {
    env: {
      ANTHROPIC_MODEL: "MiniMax-M2.1",
      ANTHROPIC_AUTH_TOKEN: "sk-test-token"
    },
    language: "Español",
    alwaysThinkingEnabled: true,
    systemPrompt: "Eres un asistente de desarrollo experto.",
    mcpServers: {
      blender: {
        command: "blender-mcp",
        args: ["--port", "3000"]
      },
      minimax: {
        command: "minimax-coding-mcp"
      }
    },
    hooks: {
      PostToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [
            { command: "quality-gates.sh", timeout: 300, type: "command" }
          ]
        }
      ],
      PreCompact: [
        {
          matcher: ".*",
          hooks: [
            { command: "checkpoint-auto-save.sh", timeout: 60, type: "command" }
          ]
        }
      ]
    },
    enabledPlugins: {
      "context7-plugin": true,
      "playwright": false
    },
    activeSkills: [
      { name: "typescript-guru", type: "skill" },
      { name: "react-expert", type: "slash" }
    ]
  };

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();

    vi.spyOn(os, "homedir").mockReturnValue(mockHomedir);
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockSettings));

    SettingsManager.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getLanguage", () => {
    it("returns language from settings", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.getLanguage()).toBe("Español");
    });

    it("returns English as default when not set", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      expect(manager.getLanguage()).toBe("English");
    });

    it("returns Spanish when explicitly set", () => {
      const manager = SettingsManager.getInstance();
      manager.setLanguage("Deutsch");
      expect(manager.getLanguage()).toBe("Deutsch");
    });
  });

  describe("setLanguage", () => {
    it("updates language setting", () => {
      const manager = SettingsManager.getInstance();
      manager.setLanguage("Français");
      expect(manager.getLanguage()).toBe("Français");
    });

    it("handles language changes multiple times", () => {
      const manager = SettingsManager.getInstance();
      manager.setLanguage("Deutsch");
      manager.setLanguage("日本語");
      manager.setLanguage("中文");
      expect(manager.getLanguage()).toBe("中文");
    });
  });

  describe("getEnv", () => {
    it("returns environment variables from settings", () => {
      const manager = SettingsManager.getInstance();
      const env = manager.getEnv();
      expect(env.ANTHROPIC_MODEL).toBe("MiniMax-M2.1");
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe("sk-test-token");
    });

    it("returns empty object when no env defined", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      expect(manager.getEnv()).toEqual({});
    });

    it("returns a copy, not the original", () => {
      const manager = SettingsManager.getInstance();
      const env1 = manager.getEnv();
      const env2 = manager.getEnv();
      expect(env1).not.toBe(env2);
    });
  });

  describe("getMCPServers", () => {
    it("returns parsed MCP servers", () => {
      const manager = SettingsManager.getInstance();
      const servers = manager.getMCPServers();
      expect(servers.has("blender")).toBe(true);
      expect(servers.has("minimax")).toBe(true);
      expect(servers.get("blender")).toEqual({
        command: "blender-mcp",
        args: ["--port", "3000"]
      });
      expect(servers.get("minimax")).toEqual({
        command: "minimax-coding-mcp"
      });
    });

    it("returns empty map when no MCP servers", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      const servers = manager.getMCPServers();
      expect(servers.size).toBe(0);
    });

    it("returns a copy, not the original", () => {
      const manager = SettingsManager.getInstance();
      const servers1 = manager.getMCPServers();
      const servers2 = manager.getMCPServers();
      expect(servers1).not.toBe(servers2);
    });
  });

  describe("getHooks", () => {
    it("returns hooks for specific event", () => {
      const manager = SettingsManager.getInstance();
      const hooks = manager.getHooks("PostToolUse");
      expect(hooks).toHaveLength(1);
      expect(hooks[0].matcher).toBe("Edit|Write");
    });

    it("returns empty array for non-existent event", () => {
      const manager = SettingsManager.getInstance();
      const hooks = manager.getHooks("NonExistentEvent");
      expect(hooks).toEqual([]);
    });

    it("returns hooks for PreCompact event", () => {
      const manager = SettingsManager.getInstance();
      const hooks = manager.getHooks("PreCompact");
      expect(hooks).toHaveLength(1);
      expect(hooks[0].matcher).toBe(".*");
    });
  });

  describe("getAllHooks", () => {
    it("returns all hooks", () => {
      const manager = SettingsManager.getInstance();
      const allHooks = manager.getAllHooks();
      expect(allHooks.has("PostToolUse")).toBe(true);
      expect(allHooks.has("PreCompact")).toBe(true);
    });
  });

  describe("getEnabledPlugins", () => {
    it("returns parsed plugins", () => {
      const manager = SettingsManager.getInstance();
      const plugins = manager.getEnabledPlugins();
      expect(plugins.has("context7-plugin")).toBe(true);
      expect(plugins.has("playwright")).toBe(true);
      expect(plugins.get("context7-plugin")?.enabled).toBe(true);
      expect(plugins.get("playwright")?.enabled).toBe(false);
    });
  });

  describe("getActiveSkills", () => {
    it("returns parsed active skills", () => {
      const manager = SettingsManager.getInstance();
      const skills = manager.getActiveSkills();
      expect(skills).toHaveLength(2);
      expect(skills[0].name).toBe("typescript-guru");
      expect(skills[0].type).toBe("skill");
      expect(skills[1].name).toBe("react-expert");
      expect(skills[1].type).toBe("slash");
    });

    it("returns empty array when no skills", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      const skills = manager.getActiveSkills();
      expect(skills).toEqual([]);
    });
  });

  describe("addActiveSkill", () => {
    it("adds new skill successfully", () => {
      const manager = SettingsManager.getInstance();
      const initialCount = manager.getActiveSkills().length;
      const result = manager.addActiveSkill({ name: "new-skill", type: "skill" });
      expect(result).toBe(true);
      expect(manager.getActiveSkills()).toHaveLength(initialCount + 1);
      expect(manager.hasActiveSkill("new-skill")).toBe(true);
    });

    it("does not add duplicate skill", () => {
      const manager = SettingsManager.getInstance();
      const initialCount = manager.getActiveSkills().length;
      const result = manager.addActiveSkill({ name: "typescript-guru", type: "skill" });
      expect(result).toBe(false);
      expect(manager.getActiveSkills()).toHaveLength(initialCount);
    });

    it("handles different types of same name", () => {
      const manager = SettingsManager.getInstance();
      const result = manager.addActiveSkill({ name: "test", type: "slash" });
      expect(result).toBe(true);
      expect(manager.hasActiveSkill("test")).toBe(true);
    });
  });

  describe("removeActiveSkill", () => {
    it("removes existing skill successfully", () => {
      const manager = SettingsManager.getInstance();
      const initialCount = manager.getActiveSkills().length;
      const result = manager.removeActiveSkill("typescript-guru");
      expect(result).toBe(true);
      expect(manager.getActiveSkills()).toHaveLength(initialCount - 1);
      expect(manager.hasActiveSkill("typescript-guru")).toBe(false);
    });

    it("returns false for non-existent skill", () => {
      const manager = SettingsManager.getInstance();
      const result = manager.removeActiveSkill("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("hasActiveSkill", () => {
    it("returns true for existing skill", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.hasActiveSkill("typescript-guru")).toBe(true);
    });

    it("returns false for non-existing skill", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.hasActiveSkill("non-existent")).toBe(false);
    });
  });

  describe("getSystemPrompt", () => {
    it("returns system prompt from settings", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.getSystemPrompt()).toBe("Eres un asistente de desarrollo experto.");
    });

    it("returns empty string when not set", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      expect(manager.getSystemPrompt()).toBe("");
    });
  });

  describe("setSystemPrompt", () => {
    it("updates system prompt", () => {
      const manager = SettingsManager.getInstance();
      manager.setSystemPrompt("Nuevo prompt de sistema");
      expect(manager.getSystemPrompt()).toBe("Nuevo prompt de sistema");
    });

    it("handles empty system prompt", () => {
      const manager = SettingsManager.getInstance();
      manager.setSystemPrompt("");
      expect(manager.getSystemPrompt()).toBe("");
    });
  });

  describe("isAlwaysThinkingEnabled", () => {
    it("returns true when enabled", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.isAlwaysThinkingEnabled()).toBe(true);
    });

    it("returns false when not set", () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue("{}");
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      expect(manager.isAlwaysThinkingEnabled()).toBe(false);
    });
  });

  describe("setAlwaysThinkingEnabled", () => {
    it("updates always thinking setting", () => {
      const manager = SettingsManager.getInstance();
      manager.setAlwaysThinkingEnabled(false);
      expect(manager.isAlwaysThinkingEnabled()).toBe(false);
    });
  });

  describe("reload", () => {
    it("reloads settings from disk", () => {
      const manager = SettingsManager.getInstance();
      manager.setLanguage("Deutsch");

      const newSettings = { ...mockSettings, language: "日本語" };
      vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(newSettings));

      manager.reload();
      expect(manager.getLanguage()).toBe("日本語");
    });

    it("handles invalid JSON gracefully", () => {
      const manager = SettingsManager.getInstance();
      vi.spyOn(fs, "readFileSync").mockReturnValue("invalid json {{{");

      expect(() => manager.reload()).not.toThrow();
    });
  });

  describe("getSettingsPath", () => {
    it("returns correct settings path", () => {
      const manager = SettingsManager.getInstance();
      expect(manager.getSettingsPath()).toBe(mockSettingsPath);
    });
  });

  describe("getRawSettings", () => {
    it("returns raw settings copy", () => {
      const manager = SettingsManager.getInstance();
      const raw1 = manager.getRawSettings();
      const raw2 = manager.getRawSettings();
      expect(raw1).not.toBe(raw2);
      expect(raw1.language).toBe(raw2.language);
    });
  });

  describe("singleton pattern", () => {
    it("returns same instance on multiple calls", () => {
      const instance1 = SettingsManager.getInstance();
      const instance2 = SettingsManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("resetInstance creates new instance", () => {
      const instance1 = SettingsManager.getInstance();
      SettingsManager.resetInstance();
      const instance2 = SettingsManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("error handling", () => {
    it("handles missing settings file gracefully", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      SettingsManager.resetInstance();
      const manager = SettingsManager.getInstance();
      expect(manager.getLanguage()).toBe("English");
      expect(manager.getActiveSkills()).toEqual([]);
    });

    it("handles malformed JSON gracefully", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readFileSync").mockReturnValue("{ malformed json }");
      SettingsManager.resetInstance();

      expect(() => SettingsManager.getInstance()).not.toThrow();
    });
  });
});
