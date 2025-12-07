import type { ReasoningConfig, ThinkingEffort } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildGoogleReasoning(
  config: ReasoningConfig,
  effort: ThinkingEffort,
): ReasoningResult {
  // PRIMARY: Gemini 2.5 uses thinking budgets
  if (config.type === "google-thinking-budget") {
    const budget = config.budgetMapping[effort];
    return {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: budget,
          },
        },
      },
    };
  }

  // Gemini 3 family uses thinking levels (low/medium/high)
  if (config.type === "google-thinking-level") {
    const level = config.levelMapping[effort];
    return {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: level,
            includeThoughts: config.includeThoughts,
          },
        },
      },
    };
  }

  throw new Error(`Invalid config type: ${config.type}`);
}
