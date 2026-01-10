import type { ModelProfile } from "./types";

/**
 * MiniMax M2 - Compact MoE with elite performance
 *
 * Research sources:
 * - MiniMax documentation
 * - 230B total / 10B active
 * - Strong coding and agentic
 */
export const minimaxMinimaxM2Profile: ModelProfile = {
  modelId: "minimax:minimax-m2",
  categoryScores: {
    coding: 88,
    reasoning: 82,
    creative: 75,
    factual: 80,
    analysis: 82,
    conversation: 78,
    multimodal: 0,
    research: 75,
  },
  strengths: [
    "Elite coding despite compact size",
    "Strong agentic capabilities",
    "205K context window",
    "Affordable ($0.30/M input)",
    "Good tool calling",
  ],
  weaknesses: ["No vision", "Less proven ecosystem", "Smaller community"],
  bestFor: [
    "Efficient coding",
    "Agentic tasks",
    "Cost-efficient performance",
    "Long-context coding",
  ],
  avoidFor: [
    "Image analysis",
    "Maximum capability needs",
    "Ecosystem requirements",
  ],
  qualityScore: 84,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Compact but capable. Good value for coding and agentic work. Consider for efficient deployments.",
};
