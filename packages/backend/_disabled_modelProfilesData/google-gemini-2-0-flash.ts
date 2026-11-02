import type { ModelProfile } from "./types";

/**
 * Gemini 2.0 Flash - Stable multimodal workhorse
 *
 * Research sources:
 * - Google AI documentation
 * - Very low pricing
 * - No thinking (simpler, faster)
 * - 1M context window
 */
export const googleGemini20FlashProfile: ModelProfile = {
  modelId: "google:gemini-2.0-flash",
  categoryScores: {
    coding: 75,
    reasoning: 72,
    creative: 75,
    factual: 80,
    analysis: 78,
    conversation: 82,
    multimodal: 85,
    research: 70,
  },
  strengths: [
    "Very affordable ($0.075/M input)",
    "1M context window",
    "Good multimodal support",
    "Stable and reliable",
    "Fast responses",
  ],
  weaknesses: [
    "No thinking capability",
    "Less capable than 2.5 Flash",
    "Older knowledge cutoff (August 2024)",
    "Not ideal for complex reasoning",
  ],
  bestFor: [
    "Budget-conscious multimodal tasks",
    "High-volume processing",
    "Simple to moderate tasks",
    "Long context at low cost",
    "Quick multimodal queries",
  ],
  avoidFor: [
    "Complex reasoning (use 2.5 Flash)",
    "Tasks needing thinking",
    "Latest knowledge requirements",
  ],
  qualityScore: 75,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Budget-friendly workhorse. Great for high-volume multimodal tasks. Upgrade to 2.5 Flash for thinking capability.",
};
