import type { ModelProfile } from "./types";

/**
 * MiniMax M2.1 Lightning - Speed-optimized variant
 *
 * Research sources:
 * - MiniMax documentation
 * - ~100 tokens/sec
 * - Same capability, faster
 */
export const minimaxMinimaxM21LightningProfile: ModelProfile = {
  modelId: "minimax:minimax-m2.1-lightning",
  categoryScores: {
    coding: 90,
    reasoning: 85,
    creative: 75,
    factual: 82,
    analysis: 85,
    conversation: 78,
    multimodal: 0,
    research: 78,
  },
  strengths: [
    "Nearly 2x faster than M2.1",
    "Same capability as M2.1",
    "~100 tokens/sec",
    "205K context",
    "Low-latency coding",
  ],
  weaknesses: ["Slightly higher output cost ($2.4/M output)", "No vision"],
  bestFor: [
    "Low-latency coding",
    "Real-time applications",
    "Speed-critical agentic tasks",
    "Interactive coding sessions",
  ],
  avoidFor: ["Maximum cost efficiency", "Image analysis"],
  qualityScore: 86,
  speedTier: "ultra-fast",
  costTier: "budget",
  notes:
    "Speed-optimized M2.1. Use when latency matters. Same smarts, much faster.",
};
