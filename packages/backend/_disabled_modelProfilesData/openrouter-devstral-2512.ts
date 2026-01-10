import type { ModelProfile } from "./types";

/**
 * Devstral 2512 (OpenRouter Free) - Free agentic coding
 *
 * Research sources:
 * - OpenRouter free tier
 * - Mistral's 123B coding model
 */
export const openrouterDevstral2512Profile: ModelProfile = {
  modelId: "openrouter:devstral-2512",
  categoryScores: {
    coding: 88,
    reasoning: 78,
    creative: 65,
    factual: 72,
    analysis: 75,
    conversation: 65,
    multimodal: 0,
    research: 68,
  },
  strengths: [
    "Completely free",
    "State-of-the-art agentic coding",
    "262K context window",
    "Multi-file orchestration",
    "Codebase exploration",
  ],
  weaknesses: [
    "No vision",
    "Specialized for coding only",
    "Free tier limits may apply",
  ],
  bestFor: [
    "Free coding assistance",
    "Agentic code generation",
    "Large codebase work",
    "Cost-free development",
  ],
  avoidFor: ["Non-coding tasks", "Image analysis", "Production critical code"],
  qualityScore: 84,
  speedTier: "fast",
  costTier: "free",
  notes:
    "Free powerful coding model. Great for experimentation and learning. 262K context is excellent.",
};
