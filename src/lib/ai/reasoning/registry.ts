import type {
  ReasoningConfig,
  ReasoningHandler,
  ThinkingEffort,
} from "./types";
import { buildAnthropicReasoning } from "./handlers/anthropic";
import { buildDeepSeekReasoning } from "./handlers/deepseek";
import { buildGoogleReasoning } from "./handlers/google";
import { buildOpenAIReasoning } from "./handlers/openai";

// Generic handler for simple providers (xAI, Perplexity, Groq)
function buildGenericReasoning(
  config: ReasoningConfig,
  effort: ThinkingEffort,
) {
  if (config.type !== "generic-reasoning-effort") {
    throw new Error(`Invalid config type: ${config.type}`);
  }

  return {
    providerOptions: {
      [config.parameterName]: effort, // Dynamic parameter name
    },
  };
}

// Map config type → handler (NO if-blocks, TypeScript enforces completeness)
export const REASONING_HANDLERS: Record<
  ReasoningConfig["type"],
  ReasoningHandler
> = {
  "openai-reasoning-effort": buildOpenAIReasoning,
  "anthropic-extended-thinking": buildAnthropicReasoning,
  "google-thinking-level": buildGoogleReasoning,
  "google-thinking-budget": buildGoogleReasoning, // Same handler
  "deepseek-tag-extraction": buildDeepSeekReasoning,
  "generic-reasoning-effort": buildGenericReasoning,
};
