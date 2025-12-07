import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildAnthropicReasoning(
  config: ReasoningConfig,
  effort: ThinkingEffort,
): ReasoningResult {
  if (config.type !== "anthropic-extended-thinking") {
    throw new Error(`Invalid config type: ${config.type}`);
  }

  const budgetTokens = config.budgetMapping[effort];

  return {
    providerOptions: {
      anthropic: {
        thinking: {
          type: "enabled",
          budgetTokens,
        },
      },
    },
    headers: {
      "anthropic-beta": config.betaHeader,
    },
  };
}
