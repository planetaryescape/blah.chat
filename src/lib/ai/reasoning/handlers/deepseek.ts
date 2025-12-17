import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import type { ActiveThinkingEffort, ReasoningConfig } from "../types";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildDeepSeekReasoning(
  config: ReasoningConfig,
  _effort: ActiveThinkingEffort, // Not used for DeepSeek (tag extraction always enabled)
): ReasoningResult {
  if (config.type !== "deepseek-tag-extraction") {
    throw new Error(`Invalid config type: ${config.type}`);
  }

  return {
    applyMiddleware: (model) =>
      wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: config.tagName }),
      }),
  };
}
