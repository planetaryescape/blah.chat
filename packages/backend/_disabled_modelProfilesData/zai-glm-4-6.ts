import type { ModelProfile } from "./types";

/**
 * GLM 4.6 - Latest GLM with enhanced capabilities
 *
 * Research sources:
 * - Z.ai/Zhipu documentation
 * - Strong coding and reasoning
 * - Agentic applications
 */
export const zaiGlm46Profile: ModelProfile = {
  modelId: "zai:glm-4.6",
  categoryScores: {
    coding: 85,
    reasoning: 82,
    creative: 78,
    factual: 82,
    analysis: 82,
    conversation: 80,
    multimodal: 0,
    research: 78,
  },
  strengths: [
    "Strong coding capability",
    "200K context window",
    "Good reasoning",
    "Agentic applications",
    "Competitive pricing ($0.45/M input)",
  ],
  weaknesses: [
    "No vision",
    "Less proven in Western markets",
    "Smaller ecosystem",
  ],
  bestFor: [
    "Coding tasks",
    "Agentic applications",
    "Long-context reasoning",
    "Cost-efficient performance",
  ],
  avoidFor: ["Image analysis", "Maximum ecosystem support"],
  qualityScore: 82,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Solid Chinese model. Good for coding and agentic tasks. Competitive with Western alternatives.",
};
