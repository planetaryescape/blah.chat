import type { ModelProfile } from "./types";

/**
 * Gemini 2.0 Flash Exp (OpenRouter Free) - Free 1M context multimodal
 *
 * Research sources:
 * - OpenRouter free tier
 * - Google's experimental Gemini
 */
export const openrouterGemini20FlashExpProfile: ModelProfile = {
  modelId: "openrouter:gemini-2.0-flash-exp",
  categoryScores: {
    coding: 75,
    reasoning: 72,
    creative: 75,
    factual: 80,
    analysis: 78,
    conversation: 82,
    multimodal: 85,
    research: 72,
  },
  strengths: [
    "Completely free",
    "Massive 1M context window",
    "Vision capability",
    "Fast time-to-first-token",
    "Function calling",
  ],
  weaknesses: [
    "Experimental status",
    "May be less stable",
    "Free tier limits may apply",
  ],
  bestFor: [
    "Free long-document processing",
    "Cost-free multimodal tasks",
    "Experimenting with 1M context",
    "Free image analysis",
  ],
  avoidFor: [
    "Production stability needs",
    "Maximum quality requirements",
    "Critical applications",
  ],
  qualityScore: 75,
  speedTier: "fast",
  costTier: "free",
  notes:
    "Free 1M context multimodal. Unique free offering. Great for experimenting with long documents.",
};
