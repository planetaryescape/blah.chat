import type { ModelProfile } from "./types";

/**
 * Qwen3 Coder (OpenRouter Free) - Free 480B coding
 *
 * Research sources:
 * - OpenRouter free tier
 * - Alibaba's massive coding model
 */
export const openrouterQwen3CoderProfile: ModelProfile = {
  modelId: "openrouter:qwen3-coder",
  categoryScores: {
    coding: 90,
    reasoning: 82,
    creative: 65,
    factual: 78,
    analysis: 78,
    conversation: 62,
    multimodal: 0,
    research: 70,
  },
  strengths: [
    "Completely free",
    "Massive 480B parameters",
    "262K context window",
    "Strong code generation",
    "Function calling support",
  ],
  weaknesses: [
    "No vision",
    "Specialized for coding",
    "Free tier limits may apply",
  ],
  bestFor: [
    "Free advanced coding",
    "Large-scale code generation",
    "Long-context code tasks",
    "Cost-free development",
  ],
  avoidFor: ["Non-coding tasks", "Image analysis", "Production critical code"],
  qualityScore: 86,
  speedTier: "medium",
  costTier: "free",
  notes:
    "Free massive coding model. 480B params at no cost. Great for serious coding experimentation.",
};
