import { describe, expect, it, beforeEach, vi } from "vitest";
import type { ThinkModeConfig } from "./unified-task-runner.js";

// Create mock before vi.mock
const mockSettingsManager = {
  getSystemPrompt: vi.fn().mockReturnValue(""),
  isAlwaysThinkingEnabled: vi.fn().mockReturnValue(false),
  getActiveSkills: vi.fn().mockReturnValue([])
};

vi.mock("./settings-manager.js", () => ({
  settingsManager: mockSettingsManager
}));

// Import the class (this happens after the mock is set up)
const { UnifiedTaskRunner } = await import("./unified-task-runner.js");

describe("UnifiedTaskRunner", () => {
  let runner: UnifiedTaskRunner;

  const defaultThinkMode: ThinkModeConfig = { enabled: false };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsManager.getSystemPrompt.mockReturnValue("");
    mockSettingsManager.isAlwaysThinkingEnabled.mockReturnValue(false);
    mockSettingsManager.getActiveSkills.mockReturnValue([]);
    runner = new UnifiedTaskRunner();
  });

  describe("configureTask", () => {
    it("configures task with basic settings", () => {
      runner.configureTask({
        folder: "/test/project",
        description: "Test task",
        mode: "secure",
        thinkMode: defaultThinkMode
      });

      expect(runner.hasTaskContext()).toBe(true);
      const context = runner.getTaskContext();
      expect(context?.folder).toBe("/test/project");
    });

    it("stores think mode configuration", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "free",
        thinkMode: { enabled: true, mode: "continuous" }
      });
      expect(runner.isThinkingEnabled()).toBe(true);
    });

    it("stores preloaded skills", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "auto",
        thinkMode: defaultThinkMode,
        preloadedSkills: ["skill1", "skill2"]
      });
      expect(runner.getActiveSkills()).toEqual(["skill1", "skill2"]);
    });
  });

  describe("clearContext", () => {
    it("clears task context", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: defaultThinkMode
      });
      runner.clearContext();
      expect(runner.hasTaskContext()).toBe(false);
    });
  });

  describe("isThinkingEnabled", () => {
    it("returns false when not configured", () => {
      expect(runner.isThinkingEnabled()).toBe(false);
    });

    it("returns true when configured with enabled", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: { enabled: true, mode: "continuous" }
      });
      expect(runner.isThinkingEnabled()).toBe(true);
    });
  });

  describe("generateThinkingBlock", () => {
    it("returns null when thinking is disabled", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: { enabled: false }
      });
      const block = runner.generateThinkingBlock("test request");
      expect(block).toBeNull();
    });

    it("returns thinking block when continuous mode enabled", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: { enabled: true, mode: "continuous" }
      });
      const block = runner.generateThinkingBlock("test request");
      expect(block).toContain("<thinking>");
      expect(block).toContain("test request");
    });
  });

  describe("buildFinalSystemPrompt", () => {
    it("returns empty string when no context", () => {
      expect(runner.buildFinalSystemPrompt()).toBe("");
    });

    it("builds system prompt with task prompt", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: defaultThinkMode,
        systemPrompt: { content: "Task prompt" }
      });
      const prompt = runner.buildFinalSystemPrompt();
      expect(prompt).toContain("Task prompt");
    });

    it("replaces when append is false", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: defaultThinkMode,
        systemPrompt: { content: "Task only", append: false }
      });
      const prompt = runner.buildFinalSystemPrompt();
      expect(prompt).toBe("Task only");
    });
  });

  describe("preparePrompt", () => {
    it("includes user request", () => {
      const prompt = runner.preparePrompt("Write a function");
      expect(prompt).toContain("Write a function");
      expect(prompt).toContain("[USER_REQUEST]");
    });

    it("includes thinking block when enabled", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: { enabled: true, mode: "continuous" }
      });
      const prompt = runner.preparePrompt("Test request");
      expect(prompt).toContain("<thinking>");
    });
  });

  describe("getTaskContext", () => {
    it("returns null when no context configured", () => {
      expect(runner.getTaskContext()).toBeNull();
    });

    it("returns context after configuration", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test task",
        mode: "secure",
        thinkMode: defaultThinkMode
      });
      const context = runner.getTaskContext();
      expect(context).not.toBeNull();
      expect(context?.folder).toBe("/test");
    });
  });

  describe("hasTaskContext", () => {
    it("returns false initially", () => {
      expect(runner.hasTaskContext()).toBe(false);
    });

    it("returns true after configuration", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: defaultThinkMode
      });
      expect(runner.hasTaskContext()).toBe(true);
    });
  });

  describe("getActiveSkills", () => {
    it("returns empty array when no context", () => {
      expect(runner.getActiveSkills()).toEqual([]);
    });

    it("returns configured skills", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: defaultThinkMode,
        preloadedSkills: ["skill1", "skill2"]
      });
      expect(runner.getActiveSkills()).toEqual(["skill1", "skill2"]);
    });
  });

  describe("getThinkMode", () => {
    it("returns disabled when no context", () => {
      expect(runner.getThinkMode()).toEqual({ enabled: false });
    });

    it("returns configured think mode", () => {
      runner.configureTask({
        folder: "/test",
        description: "Test",
        mode: "secure",
        thinkMode: { enabled: true, mode: "on-demand", maxReasoningTokens: 1000 }
      });
      const mode = runner.getThinkMode();
      expect(mode).toEqual({ enabled: true, mode: "on-demand", maxReasoningTokens: 1000 });
    });
  });
});
