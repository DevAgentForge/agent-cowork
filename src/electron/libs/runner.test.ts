import { describe, expect, it } from "vitest";
import { createCanUseTool, isToolAllowed, parseAllowedTools } from "./runner.js";
import type { PermissionMode } from "../types.js";
import type { Session } from "./session-store.js";

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "session-1",
  title: "Test",
  status: "idle",
  cwd: "/tmp",
  allowedTools: undefined,
  permissionMode: "secure",
  lastPrompt: "",
  pendingPermissions: new Map(),
  ...overrides
});

describe("parseAllowedTools", () => {
  it("returns null when undefined", () => {
    expect(parseAllowedTools(undefined)).toBeNull();
  });

  it("parses comma-separated tools", () => {
    const set = parseAllowedTools("Read, Edit ,Bash");
    expect(set?.has("read")).toBe(true);
    expect(set?.has("edit")).toBe(true);
    expect(set?.has("bash")).toBe(true);
  });

  it("treats empty string as empty set", () => {
    const set = parseAllowedTools("  ");
    expect(set).not.toBeNull();
    expect(set?.size).toBe(0);
  });
});

describe("isToolAllowed", () => {
  it("always allows AskUserQuestion", () => {
    const set = parseAllowedTools("Read");
    expect(isToolAllowed("AskUserQuestion", set)).toBe(true);
  });

  it("allows tool when in set", () => {
    const set = parseAllowedTools("Read,Edit");
    expect(isToolAllowed("Read", set)).toBe(true);
  });

  it("denies tool when not in set", () => {
    const set = parseAllowedTools("Read,Edit");
    expect(isToolAllowed("Bash", set)).toBe(false);
  });
});

describe("createCanUseTool", () => {
  it("denies disallowed tools in secure mode", async () => {
    const session = makeSession({ allowedTools: "Read,Edit", permissionMode: "secure" });
    const canUseTool = createCanUseTool({
      session,
      permissionMode: "secure",
      allowedTools: parseAllowedTools(session.allowedTools),
      sendPermissionRequest: () => {}
    });

    const result = await canUseTool("Bash", { command: "ls" }, { signal: new AbortController().signal });
    expect(result.behavior).toBe("deny");
  });

  it("requests permission for allowed tools in secure mode", async () => {
    const session = makeSession({ allowedTools: "Read,Edit", permissionMode: "secure" });
    let requested = false;
    const canUseTool = createCanUseTool({
      session,
      permissionMode: "secure",
      allowedTools: parseAllowedTools(session.allowedTools),
      sendPermissionRequest: () => {
        requested = true;
      }
    });

    const promise = canUseTool("Read", { file_path: "a.txt" }, { signal: new AbortController().signal });
    expect(requested).toBe(true);
    expect(session.pendingPermissions.size).toBe(1);

    const pending = Array.from(session.pendingPermissions.values())[0];
    pending.resolve({ behavior: "allow", updatedInput: pending.input });
    const result = await promise;
    expect(result.behavior).toBe("allow");
  });

  it("allows tools immediately in free mode", async () => {
    const session = makeSession({ allowedTools: "Read", permissionMode: "free" as PermissionMode });
    let requested = false;
    const canUseTool = createCanUseTool({
      session,
      permissionMode: "free",
      allowedTools: parseAllowedTools(session.allowedTools),
      sendPermissionRequest: () => {
        requested = true;
      }
    });

    const result = await canUseTool("Bash", { command: "ls" }, { signal: new AbortController().signal });
    expect(result.behavior).toBe("allow");
    expect(requested).toBe(false);
    expect(session.pendingPermissions.size).toBe(0);
  });

  it("still requests AskUserQuestion in free mode", async () => {
    const session = makeSession({ permissionMode: "free" as PermissionMode });
    let requested = false;
    const canUseTool = createCanUseTool({
      session,
      permissionMode: "free",
      allowedTools: parseAllowedTools(session.allowedTools),
      sendPermissionRequest: () => {
        requested = true;
      }
    });

    const promise = canUseTool("AskUserQuestion", { questions: [] }, { signal: new AbortController().signal });
    expect(requested).toBe(true);
    expect(session.pendingPermissions.size).toBe(1);

    const pending = Array.from(session.pendingPermissions.values())[0];
    pending.resolve({ behavior: "allow", updatedInput: pending.input });
    const result = await promise;
    expect(result.behavior).toBe("allow");
  });
});
