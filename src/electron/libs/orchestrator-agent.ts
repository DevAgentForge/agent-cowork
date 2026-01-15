import type { ServerEvent } from "../types.js";
import type { Session } from "./session-store.js";
import { settingsManager } from "./settings-manager.js";
import { unifiedCommandParser, type ParsedInput } from "./unified-commands.js";
import { unifiedTaskRunner } from "./unified-task-runner.js";
import type { RunnerOptions, RunnerHandle } from "./runner.js";
import { runClaude } from "./runner.js";

export interface OrchestratorOptions extends Partial<RunnerOptions> {
  language?: string;
  injectSkills?: boolean;
  systemPromptAddition?: string;
}

export interface OrchestratorResult {
  success: boolean;
  message?: string;
  events: ServerEvent[];
}

export type OrchestratorEventHandler = (event: ServerEvent) => void;

export class OrchestratorAgent {
  private session: Session;
  private runnerHandle: RunnerHandle | null = null;
  private eventHandler: OrchestratorEventHandler;
  private language: string;
  private injectedSkills: string[];
  private aborted: boolean = false;

  constructor(
    session: Session,
    eventHandler: OrchestratorEventHandler,
    options: OrchestratorOptions = {}
  ) {
    this.session = session;
    this.eventHandler = eventHandler;
    this.language = options.language || settingsManager.getLanguage();
    this.injectedSkills = options.injectSkills
      ? settingsManager.getActiveSkills().map(s => s.name)
      : [];
  }

  async execute(prompt: string): Promise<OrchestratorResult> {
    if (this.aborted) {
      return {
        success: false,
        message: "Session was aborted",
        events: []
      };
    }

    const parsed = unifiedCommandParser.parse(prompt);

    if (parsed.isUnified) {
      return this.handleUnifiedCommand(parsed);
    }

    const enhancedPrompt = unifiedTaskRunner.preparePrompt(prompt);
    return this.executeWithClaude(enhancedPrompt);
  }

  private async handleUnifiedCommand(parsed: ParsedInput): Promise<OrchestratorResult> {
    const command = unifiedCommandParser.getCommand(parsed.command);

    if (!command) {
      return {
        success: false,
        message: `Unknown command: /${parsed.command}. Type /help for available commands.`,
        events: []
      };
    }

    if (command.type === "native") {
      return this.handleNativeCommand(command.name, parsed.args);
    }

    const skillPrompt = unifiedTaskRunner.preparePrompt(
      `[SKILL_EXECUTION: ${command.name}]\n[ARGS: ${JSON.stringify(parsed.args)}]\n\n`
    );
    return this.executeWithClaude(skillPrompt);
  }

  private handleNativeCommand(command: string, _args: string[]): OrchestratorResult {
    const events: ServerEvent[] = [];

    switch (command) {
      case "help": {
        // Just emit a text message via the session's normal flow
        // The UI will display the help text
        break;
      }

      case "status": {
        events.push({
          type: "session.status",
          payload: {
            sessionId: this.session.id,
            status: this.session.status,
            title: this.session.title,
            cwd: this.session.cwd
          }
        });
        break;
      }

      case "clear": {
        events.push({
          type: "runner.error",
          payload: { sessionId: this.session.id, message: "CLEAR_SESSION" }
        });
        break;
      }

      case "exit": {
        events.push({
          type: "session.status",
          payload: {
            sessionId: this.session.id,
            status: "completed",
            title: this.session.title
          }
        });
        break;
      }
    }

    for (const event of events) {
      this.eventHandler(event);
    }

    return { success: true, events };
  }

  private buildHelpText(): string {
    const commands = unifiedCommandParser.getAllCommands();
    const commandList = commands.map(c => `  /${c.name} - ${c.description}`).join("\n");

    const skillsSection = this.injectedSkills.length > 0
      ? `\n\nActive Skills: ${this.injectedSkills.join(", ")}`
      : "";

    const languageSection = this.language !== "English"
      ? `\nLanguage: ${this.language}`
      : "";

    return `Available Commands:\n${commandList}${skillsSection}${languageSection}`;
  }

  private async executeWithClaude(prompt: string): Promise<OrchestratorResult> {
    const events: ServerEvent[] = [];
    let resolved = false;
    let resolvePromise: () => void;
    const _promise = new Promise<void>(resolve => { resolvePromise = resolve; });

    const runnerOptions: RunnerOptions = {
      prompt,
      session: this.session,
      resumeSessionId: this.session.claudeSessionId,
      onEvent: (event) => {
        events.push(event);
        this.eventHandler(event);

        if (event.type === "session.status" &&
            (event.payload.status === "completed" || event.payload.status === "error")) {
          resolved = true;
          resolvePromise();
        }
      },
      onSessionUpdate: (updates) => {
        Object.assign(this.session, updates);
      }
    };

    try {
      this.runnerHandle = await runClaude(runnerOptions);

      const timeoutMs = 300000;
      const startTime = Date.now();

      while (!resolved && !this.aborted) {
        if (Date.now() - startTime > timeoutMs) {
          return {
            success: false,
            message: "Execution timeout (5 minutes)",
            events
          };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return { success: true, events };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        events
      };
    }
  }

  abort(): void {
    this.aborted = true;
    this.runnerHandle?.abort();
  }

  getLanguage(): string {
    return this.language;
  }

  getInjectedSkills(): string[] {
    return [...this.injectedSkills];
  }

  isAborted(): boolean {
    return this.aborted;
  }
}

export function createOrchestratorAgent(
  session: Session,
  eventHandler: OrchestratorEventHandler,
  options?: OrchestratorOptions
): OrchestratorAgent {
  return new OrchestratorAgent(session, eventHandler, options);
}
