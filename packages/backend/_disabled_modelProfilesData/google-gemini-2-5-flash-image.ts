import type { ModelProfile } from "./types";

/**
 * Gemini 2.5 Flash Image - Fast image generation
 *
 * Research sources:
 * - Google AI documentation
 * - Cost-effective image generation
 * - Locale-aware outputs
 */
export const googleGemini25FlashImageProfile: ModelProfile = {
  modelId: "google:gemini-2.5-flash-image",
  categoryScores: {
    coding: 40,
    reasoning: 55,
    creative: 85,
    factual: 55,
    analysis: 55,
    conversation: 50,
    multimodal: 90,
    research: 45,
  },
  strengths: [
    "Fast image generation",
    "More affordable than 3 Pro Image",
    "Locale-aware cultural outputs",
    "Vision understanding",
    "Good for quick visual creation",
  ],
  weaknesses: [
    "Limited 32K context",
    "Experimental",
    "Not for text-heavy tasks",
    "Less capable than 3 Pro Image",
  ],
  bestFor: [
    "Fast image generation",
    "Cost-effective visual creation",
    "Culturally-aware images",
    "Quick design iterations",
    "Slide and presentation images",
  ],
  avoidFor: [
    "Complex text reasoning",
    "Coding tasks",
    "Long context needs",
    "Maximum image quality",
  ],
  qualityScore: 72,
  speedTier: "fast",
  costTier: "standard",
  notes:
    "Budget-friendly image generation. Use for quick visuals. Upgrade to 3 Pro Image for maximum quality.",
};
