import type { ModelProfile } from "./types";

/**
 * Grok 4 Fast - Faster non-reasoning Grok variant
 *
 * Research sources:
 * - xAI documentation
 * - Good conversational ability
 * - Grok's signature personality
 */
export const xaiGrok4FastProfile: ModelProfile = {
  modelId: "xai:grok-4-fast",
  categoryScores: {
    coding: 75,
    reasoning: 72,
    creative: 85,
    factual: 80,
    analysis: 75,
    conversation: 90,
    multimodal: 0,
    research: 75,
  },
  strengths: [
    "Fast responses",
    "Unique personality and humor",
    "Good conversational ability",
    "256K context window",
    "Function calling support",
  ],
  weaknesses: [
    "No vision capability",
    "No reasoning/thinking mode",
    "Moderate pricing ($2/M input)",
    "Less specialized than other models",
  ],
  bestFor: [
    "Conversational AI with personality",
    "Quick general tasks",
    "Content with humor",
    "General purpose use",
  ],
  avoidFor: [
    "Complex reasoning",
    "Image analysis",
    "Maximum capability needs",
    "Serious/formal content",
  ],
  qualityScore: 78,
  speedTier: "fast",
  costTier: "standard",
  notes:
    "Grok's personality is unique. Good for casual use. Upgrade to 4.1 for longer context or reasoning.",
};
