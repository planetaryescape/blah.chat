import type { ModelProfile } from "./types";

/**
 * GLM 4.7 - Latest flagship with thinking
 *
 * Research sources:
 * - Z.ai/Zhipu documentation
 * - Stronger coding and multi-step reasoning
 * - Thinking capability
 */
export const zaiGlm47Profile: ModelProfile = {
  modelId: "zai:glm-4.7",
  categoryScores: {
    coding: 88,
    reasoning: 88,
    creative: 78,
    factual: 85,
    analysis: 88,
    conversation: 78,
    multimodal: 0,
    research: 82,
  },
  strengths: [
    "Thinking capability",
    "Strong multi-step reasoning",
    "Excellent coding",
    "200K context",
    "Agentic workflows",
  ],
  weaknesses: [
    "No vision",
    "Slightly higher pricing ($0.60/M input)",
    "Less Western market presence",
  ],
  bestFor: [
    "Complex coding with reasoning",
    "Agentic multi-step tasks",
    "Advanced analysis",
    "Reasoning-heavy workflows",
  ],
  avoidFor: ["Image analysis", "Simple tasks (overkill)"],
  qualityScore: 86,
  speedTier: "medium",
  costTier: "budget",
  notes:
    "GLM flagship with thinking. Strong for complex coding and reasoning. Good value.",
};
