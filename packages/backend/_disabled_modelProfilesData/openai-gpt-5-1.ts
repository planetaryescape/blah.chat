import type { ModelProfile } from "./types";

/**
 * GPT-5.1 - Latest flagship with adaptive reasoning
 *
 * Research sources:
 * - OpenAI November 2025 release notes
 * - 24h prompt caching for cost efficiency
 * - Strong multi-modal and reasoning capabilities
 */
export const openaiGpt51Profile: ModelProfile = {
  modelId: "openai:gpt-5.1",
  categoryScores: {
    coding: 90,
    reasoning: 93,
    creative: 88,
    factual: 90,
    analysis: 92,
    conversation: 82,
    multimodal: 92,
    research: 88,
  },
  strengths: [
    "Latest OpenAI architecture improvements",
    "Adaptive reasoning (adjusts effort to task)",
    "24h prompt caching reduces costs",
    "256K context window",
    "Excellent at novel problems",
  ],
  weaknesses: [
    "Premium pricing ($1.25/M input)",
    "Slower for simple queries due to reasoning",
    "Knowledge cutoff November 2025",
  ],
  bestFor: [
    "Complex reasoning that requires thinking",
    "Multi-modal analysis tasks",
    "Research and synthesis",
    "Advanced coding projects",
    "Tasks benefiting from adaptive effort",
  ],
  avoidFor: [
    "Simple Q&A (use Mini instead)",
    "Cost-sensitive high-volume tasks",
    "Ultra-low latency requirements",
  ],
  qualityScore: 93,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Best all-around OpenAI model. Adaptive reasoning means it thinks harder on hard problems. 24h caching makes repeated queries cheaper.",
};
