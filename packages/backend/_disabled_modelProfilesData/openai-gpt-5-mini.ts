import type { ModelProfile } from "./types";

/**
 * GPT-5 Mini - Compact variant balancing cost and performance
 *
 * Research sources:
 * - OpenAI documentation
 * - User feedback indicates strong value proposition
 * - Benchmarks show near-GPT-5 performance at fraction of cost
 */
export const openaiGpt5MiniProfile: ModelProfile = {
  modelId: "openai:gpt-5-mini",
  categoryScores: {
    coding: 82,
    reasoning: 78,
    creative: 80,
    factual: 85,
    analysis: 80,
    conversation: 88,
    multimodal: 85,
    research: 75,
  },
  strengths: [
    "Excellent cost-to-performance ratio",
    "Fast response times",
    "Good vision capabilities",
    "Handles most everyday tasks well",
    "Large 200K context window",
  ],
  weaknesses: [
    "Less capable than GPT-5 on complex reasoning",
    "Can struggle with very nuanced tasks",
    "May miss subtle context in long documents",
  ],
  bestFor: [
    "General-purpose chat applications",
    "Everyday coding assistance",
    "Content creation and editing",
    "High-volume applications",
    "Cost-conscious deployments",
  ],
  avoidFor: [
    "PhD-level reasoning tasks",
    "Complex multi-step mathematical proofs",
    "Tasks requiring maximum accuracy",
  ],
  qualityScore: 82,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Default choice for most users. Excellent balance of capability and cost. Upgrade to GPT-5 only for complex reasoning.",
};
