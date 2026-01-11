import type { ModelProfile } from "./types";

/**
 * Llama 3.3 70B (OpenRouter Free) - Free multilingual model
 *
 * Research sources:
 * - OpenRouter free tier
 * - Meta's dialogue-optimized model
 */
export const openrouterLlama3370bProfile: ModelProfile = {
  modelId: "openrouter:llama-3.3-70b",
  categoryScores: {
    coding: 82,
    reasoning: 78,
    creative: 78,
    factual: 80,
    analysis: 78,
    conversation: 85,
    multimodal: 0,
    research: 72,
  },
  strengths: [
    "Completely free",
    "Multilingual (8 languages)",
    "Good function calling",
    "131K context",
    "Instruction following",
  ],
  weaknesses: [
    "No vision",
    "Less capable than newer models",
    "Free tier limits may apply",
  ],
  bestFor: [
    "Free multilingual tasks",
    "Cost-free dialogue",
    "Instruction following",
    "General purpose free usage",
  ],
  avoidFor: [
    "Image analysis",
    "Maximum capability needs",
    "Production critical tasks",
  ],
  qualityScore: 78,
  speedTier: "fast",
  costTier: "free",
  notes:
    "Free Llama for general use. Good multilingual support. Great for experimentation.",
};
