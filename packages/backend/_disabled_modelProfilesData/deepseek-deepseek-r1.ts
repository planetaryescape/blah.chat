import type { ModelProfile } from "./types";

/**
 * DeepSeek R1 - 671B MoE reasoning model
 *
 * Research sources:
 * - DeepSeek documentation
 * - Groundbreaking reasoning architecture
 * - Competitive with OpenAI o1
 * - AIME 2024 (79.8%), MATH-500 (97.3%)
 */
export const deepseekDeepseekR1Profile: ModelProfile = {
  modelId: "deepseek:deepseek-r1",
  categoryScores: {
    coding: 85,
    reasoning: 95,
    creative: 72,
    factual: 85,
    analysis: 90,
    conversation: 70,
    multimodal: 0,
    research: 88,
  },
  strengths: [
    "Groundbreaking reasoning capability",
    "Visible chain-of-thought",
    "671B MoE scale",
    "Competitive with o1 on benchmarks",
    "Affordable ($0.55/M input)",
  ],
  weaknesses: [
    "No vision capability",
    "Can be verbose in reasoning",
    "Knowledge cutoff November 2024",
    "128K context limit",
  ],
  bestFor: [
    "Complex mathematical reasoning",
    "Step-by-step problem solving",
    "Algorithm design",
    "Research-level analysis",
    "Debugging complex logic",
  ],
  avoidFor: [
    "Image analysis",
    "Quick simple answers",
    "Creative writing",
    "Casual conversation",
  ],
  qualityScore: 92,
  speedTier: "fast", // Via Cerebras/Groq
  costTier: "budget",
  notes:
    "Revolutionary reasoner. Best open-source reasoning model. Visible thinking makes it great for learning.",
};
