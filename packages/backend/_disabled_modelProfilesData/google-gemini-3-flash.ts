import type { ModelProfile } from "./types";

/**
 * Gemini 3 Flash - Google's most intelligent fast model
 *
 * Research sources:
 * - Google AI August 2025 release
 * - Frontier intelligence optimized for speed
 * - Built-in search grounding
 * - 1M context window
 */
export const googleGemini3FlashProfile: ModelProfile = {
  modelId: "google:gemini-3-flash",
  categoryScores: {
    coding: 88,
    reasoning: 90,
    creative: 85,
    factual: 92,
    analysis: 90,
    conversation: 85,
    multimodal: 90,
    research: 88,
  },
  strengths: [
    "Frontier intelligence at flash speeds",
    "Built-in search grounding",
    "1M context window",
    "Thinking capability",
    "More recent knowledge (August 2025)",
  ],
  weaknesses: [
    "More expensive than 2.5 Flash ($0.50/M input)",
    "Newer model (less battle-tested)",
  ],
  bestFor: [
    "Speed-critical tasks needing high intelligence",
    "Real-time applications with search",
    "Up-to-date information needs",
    "Fast multimodal processing",
    "Grounded factual responses",
  ],
  avoidFor: [
    "Maximum budget efficiency (use 2.5 Flash)",
    "Tasks needing 2M context (use 2.5 Pro)",
  ],
  qualityScore: 90,
  speedTier: "fast",
  costTier: "standard",
  notes:
    "Latest Google intelligence with speed focus. Search grounding is unique. Use for current events and factual accuracy.",
};
