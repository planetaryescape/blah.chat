import type { ModelProfile } from "./types";

/**
 * GPT-5 - OpenAI's flagship model with advanced reasoning
 *
 * Research sources:
 * - OpenAI documentation
 * - User feedback from X/Twitter, Reddit
 * - Professional benchmarks (MMLU, HumanEval, GPQA)
 */
export const openaiGpt5Profile: ModelProfile = {
  modelId: "openai:gpt-5",
  categoryScores: {
    coding: 88,
    reasoning: 92,
    creative: 85,
    factual: 88,
    analysis: 90,
    conversation: 78,
    multimodal: 90,
    research: 82,
  },
  strengths: [
    "Advanced multi-step reasoning with thinking capability",
    "Excellent vision/multimodal understanding",
    "Strong at complex code architecture",
    "Superior at scientific and mathematical reasoning",
    "High-quality long-form content generation",
  ],
  weaknesses: [
    "More expensive than smaller variants",
    "Slower due to reasoning overhead",
    "Can be verbose for simple queries",
    "Overkill for basic Q&A tasks",
  ],
  bestFor: [
    "Complex multi-step reasoning problems",
    "Research synthesis and analysis",
    "Advanced code architecture decisions",
    "Scientific paper analysis",
    "Nuanced creative writing with depth",
  ],
  avoidFor: [
    "Simple factual questions",
    "High-volume processing tasks",
    "Quick translations or formatting",
    "Cost-sensitive applications",
  ],
  qualityScore: 90,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Best-in-class for complex reasoning. Use GPT-5 Mini for everyday tasks to save cost.",
};
