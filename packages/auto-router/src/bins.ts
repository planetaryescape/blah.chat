/**
 * Route Bins Configuration
 *
 * Maps each route label to an ordered list of primary and fallback models.
 * These are product trade-off bins, not task types.
 */

import type { ModelBin, RouteLabel } from "./types";

export const ROUTE_BINS: Record<RouteLabel, ModelBin> = {
  fast_cheap_chat: {
    label: "fast_cheap_chat",
    description: "Quick simple responses",
    primary: [
      "openai:gpt-5-nano",
      "google:gemini-2.0-flash",
      "meta:llama-4-scout",
    ],
    fallbacks: ["openai:gpt-5-mini", "deepseek:deepseek-chat"],
  },

  balanced_general: {
    label: "balanced_general",
    description: "Everyday tasks",
    primary: [
      "openai:gpt-5-mini",
      "google:gemini-2.5-flash",
      "anthropic:claude-3.5-haiku",
    ],
    fallbacks: ["openai:gpt-5.1-instant", "deepseek:deepseek-chat"],
  },

  code_heavy: {
    label: "code_heavy",
    description: "Code generation, debugging, architecture",
    primary: [
      "openai:gpt-5.1-codex",
      "anthropic:claude-sonnet-4",
      "deepseek:deepseek-r1",
    ],
    fallbacks: ["openai:gpt-5.1", "google:gemini-2.5-pro"],
  },

  long_context: {
    label: "long_context",
    description: "Large documents, long conversations",
    primary: [
      "google:gemini-2.5-pro",
      "openai:gpt-5.2",
      "google:gemini-2.5-flash",
    ],
    fallbacks: ["openai:gpt-5.1", "meta:llama-4-scout"],
    constraints: {
      requiresLongContext: true,
      minContextWindow: 128000,
    },
  },

  strict_json: {
    label: "strict_json",
    description: "Structured output, extraction",
    primary: [
      "openai:gpt-5-mini",
      "google:gemini-2.5-flash",
      "openai:gpt-5.1-instant",
    ],
    fallbacks: ["deepseek:deepseek-chat", "openai:gpt-5-nano"],
  },

  creative_writing: {
    label: "creative_writing",
    description: "Stories, copy, brainstorming",
    primary: ["anthropic:claude-sonnet-4", "openai:gpt-5.1", "openai:gpt-5.2"],
    fallbacks: ["openai:gpt-5-mini", "google:gemini-2.5-pro"],
  },

  research: {
    label: "research",
    description: "Web search, fact-checking",
    primary: ["perplexity:sonar-pro", "perplexity:sonar"],
    fallbacks: ["openai:gpt-5.1", "google:gemini-2.5-pro"],
  },

  vision: {
    label: "vision",
    description: "Image analysis, visual content",
    primary: [
      "google:gemini-2.5-pro",
      "openai:gpt-5.1",
      "anthropic:claude-sonnet-4",
    ],
    fallbacks: ["openai:gpt-5-mini", "google:gemini-2.5-flash"],
    constraints: {
      requiresVision: true,
    },
  },

  reasoning_complex: {
    label: "reasoning_complex",
    description: "Math, logic, high-stakes",
    primary: ["openai:gpt-5.2", "openai:gpt-5.1", "anthropic:claude-sonnet-4"],
    fallbacks: ["deepseek:deepseek-r1", "google:gemini-2.5-pro"],
    constraints: {
      requiresReasoning: true,
    },
  },

  fallback_default: {
    label: "fallback_default",
    description: "When nothing matches",
    primary: ["openai:gpt-5-mini"],
    fallbacks: ["google:gemini-2.5-flash", "openai:gpt-5.1-instant"],
  },
};
