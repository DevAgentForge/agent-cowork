import { getCurrentApiConfig, buildEnvForConfig } from "./claude-settings.js";
import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { app } from "electron";
import { join } from "path";
import { homedir } from "os";

// Get Claude Code CLI path for packaged app
export function getClaudeCodePath(): string | undefined {
  if (app.isPackaged) {
    // For packaged apps, the SDK needs the explicit path to the CLI
    // The path should point to the unpackaged asar.unpacked directory
    return join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
    );
  }
  // In development, return undefined to let the SDK find the CLI via PATH
  return undefined;
}

// Build enhanced PATH for packaged environment
export function getEnhancedEnv(): Record<string, string | undefined> {
  const home = homedir();
  const additionalPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${home}/.bun/bin`,
    `${home}/.nvm/versions/node/v20.0.0/bin`,
    `${home}/.nvm/versions/node/v22.0.0/bin`,
    `${home}/.nvm/versions/node/v18.0.0/bin`,
    `${home}/.volta/bin`,
    `${home}/.fnm/aliases/default/bin`,
    '/usr/bin',
    '/bin',
  ];

  const currentPath = process.env.PATH || '';
  const newPath = [...additionalPaths, currentPath].join(':');

  return {
    ...process.env,
    PATH: newPath,
  };
}

export const enhancedEnv = getEnhancedEnv();

// 从用户输入中提取标题的辅助函数
function extractTitleFromInput(userIntent: string): string {
  // 移除换行和多余空格
  const cleaned = userIntent.trim().replace(/\s+/g, ' ');
  // 取前 50 个字符
  const title = cleaned.slice(0, 50);
  // 如果被截断，添加省略号
  return cleaned.length > 50 ? `${title}...` : title;
}

export const generateSessionTitle = async (userIntent: string | null) => {
  if (!userIntent) return "New Session";

  // Get the Claude Code path when needed, not at module load time
  const claudeCodePath = getClaudeCodePath();

  try {
    const result: SDKResultMessage = await unstable_v2_prompt(
      `please analynis the following user input to generate a short but clearly title to identify this conversation theme:
      ${userIntent}
      directly output the title, do not include any other content`, {
      model: claudeCodeEnv.ANTHROPIC_MODEL,
      env: enhancedEnv,
      pathToClaudeCodeExecutable: claudeCodePath,
    });

    if (result.subtype === "success") {
      return result.result;
    }

    // Log any non-success result for debugging
    console.error("Claude SDK returned non-success result:", result);
    return "New Session";
  } catch (error) {
    // Enhanced error logging for packaged app debugging
    console.error("Failed to generate session title:", error);
    console.error("Claude Code path:", claudeCodePath);
    console.error("Is packaged:", app.isPackaged);
    console.error("Resources path:", process.resourcesPath);

    // Return a simple title based on user input as fallback
    if (userIntent) {
      const words = userIntent.trim().split(/\s+/).slice(0, 5);
      return words.join(" ").toUpperCase() + (userIntent.trim().split(/\s+/).length > 5 ? "..." : "");
    }

    return "New Session";
  }
};
