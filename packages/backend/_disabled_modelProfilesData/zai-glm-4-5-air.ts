import type { ModelProfile } from "./types";

/**
 * GLM 4.5 Air - Lightweight agent-oriented MoE
 *
 * Research sources:
 * - Z.ai/Zhipu documentation
 * - 106B total / 12B active
 * - Agent-focused
 */
export const zaiGlm45AirProfile: ModelProfile = {
  modelId: "zai:glm-4.5-air",
  categoryScores: {
    coding: 75,
    reasoning: 72,
    creative: 70,
    factual: 75,
    analysis: 72,
    conversation: 75,
    multimodal: 0,
    research: 68,
  },
  strengths: [
    "Lightweight and fast",
    "Agent-oriented design",
    "Affordable ($0.20/M input)",
    "Good tool calling",
    "128K context",
  ],
  weaknesses: [
    "Internal only",
    "No vision",
    "Less capable than larger GLM models",
  ],
  bestFor: [
    "Lightweight agentic tasks",
    "Cost-efficient automation",
    "Internal tool calling",
    "Simple agentic workflows",
  ],
  avoidFor: ["Public-facing use", "Image analysis", "Complex reasoning"],
  qualityScore: 72,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Lightweight agent model. Internal use only. Good for simple agentic tasks at low cost.",
};
