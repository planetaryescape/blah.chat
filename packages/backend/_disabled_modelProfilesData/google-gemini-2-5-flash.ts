import type { ModelProfile } from "./types";

/**
 * Gemini 2.5 Flash - Fast production model with thinking
 *
 * Research sources:
 * - Google AI documentation
 * - 1M context window (massive)
 * - Thinking capability for complex tasks
 * - Very competitive pricing
 */
export const googleGemini25FlashProfile: ModelProfile = {
  modelId: "google:gemini-2.5-flash",
  categoryScores: {
    coding: 82,
    reasoning: 85,
    creative: 80,
    factual: 85,
    analysis: 88,
    conversation: 82,
    multimodal: 88,
    research: 80,
  },
  strengths: [
    "Massive 1M token context window",
    "Very fast responses",
    "Thinking capability",
    "Great multimodal support",
    "Competitive pricing ($0.15/M input)",
  ],
  weaknesses: [
    "Thinking output is 6x more expensive",
    "Not as capable as 2.5 Pro",
    "Knowledge cutoff January 2025",
  ],
  bestFor: [
    "Long document processing",
    "Real-time applications",
    "Multimodal tasks with large context",
    "Speed-critical thinking tasks",
    "Cost-effective reasoning",
  ],
  avoidFor: [
    "Maximum reasoning depth (use 2.5 Pro)",
    "Tasks needing latest knowledge",
  ],
  qualityScore: 84,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Best value for long context. 1M tokens is unique. Use for document analysis, upgrade to 2.5 Pro for complex reasoning.",
};
