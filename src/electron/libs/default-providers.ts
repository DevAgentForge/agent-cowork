import type { LlmProviderConfig } from "../types.js";

export interface DefaultProviderConfig extends LlmProviderConfig {
  isDefault: boolean;
  envOverrides: Record<string, string>;
}

export const DEFAULT_PROVIDERS: DefaultProviderConfig[] = [
  {
    id: "minimax",
    name: "MiniMax (Default)",
    baseUrl: "https://api.minimax.io/anthropic",
    authToken: "",
    defaultModel: "MiniMax-M2.1",
    models: {
      opus: "MiniMax-M2.1",
      sonnet: "MiniMax-M2.1",
      haiku: "MiniMax-M2.1"
    },
    isDefault: true,
    envOverrides: {
      ANTHROPIC_MODEL: "MiniMax-M2.1",
      API_TIMEOUT_MS: "3000000",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: "64000",
      CLAUDE_CODE_SUBAGENT_MODEL: "MiniMax-M2.1"
    }
  }
];

export function getDefaultProviders(): DefaultProviderConfig[] {
  return [...DEFAULT_PROVIDERS];
}

export function getDefaultProvider(id: string): DefaultProviderConfig | undefined {
  return DEFAULT_PROVIDERS.find(p => p.id === id);
}

export function isDefaultProvider(id: string): boolean {
  return DEFAULT_PROVIDERS.some(p => p.id === id);
}
