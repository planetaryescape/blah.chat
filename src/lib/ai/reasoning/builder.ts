import type { ModelConfig } from "../models";
import { REASONING_HANDLERS } from "./registry";
import type { ActiveThinkingEffort, ThinkingEffort } from "./types";

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
  // "none" effort = skip reasoning entirely (run model without thinking)
  if (effortLevel === "none") return null;

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
  // After "none" check, effortLevel is guaranteed to be ActiveThinkingEffort
  try {
    return handler(modelConfig.reasoning, effortLevel as ActiveThinkingEffort);
  } catch (error) {
    console.error("[Reasoning] Handler failed:", error);
    return null;
  }
}
