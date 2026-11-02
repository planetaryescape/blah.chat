import type { ActiveThinkingEffort, ReasoningConfig } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildOpenAIReasoning(
  config: ReasoningConfig,
  effort: ActiveThinkingEffort,
): ReasoningResult {
  if (config.type !== "openai-reasoning-effort") {
    throw new Error(`Invalid config type: ${config.type}`);
  }

  const mappedEffort = config.effortMapping[effort];

  return {
    providerOptions: {
      openai: {
        reasoningEffort: mappedEffort,
        reasoningSummary: config.summaryLevel || "detailed",
      },
    },
    useResponsesAPI: config.useResponsesAPI,
  };
}
