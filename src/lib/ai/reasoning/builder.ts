import type { ModelConfig } from "../models";
import type { ThinkingEffort } from "./types";
import { REASONING_HANDLERS } from "./registry";

export interface ReasoningResult {
  providerOptions?: any;
  headers?: Record<string, string>;
  useResponsesAPI?: boolean;
  applyMiddleware?: (model: any) => any;
}

export function buildReasoningOptions(
  modelConfig: ModelConfig,
  effortLevel: ThinkingEffort,
): ReasoningResult | null {
  // No reasoning config? Graceful degradation
  if (!modelConfig.reasoning) return null;

  // Lookup handler from registry
  const handler = REASONING_HANDLERS[modelConfig.reasoning.type];
  if (!handler) {
    console.warn(
      `[Reasoning] No handler for type: ${modelConfig.reasoning.type}`,
    );
    return null;
  }

  // Call handler with config + effort (try/catch prevents crashes)
  try {
    return handler(modelConfig.reasoning, effortLevel);
  } catch (error) {
    console.error("[Reasoning] Handler failed:", error);
    return null;
  }
}
