import type { ModelProfile } from "./types";

/**
 * GPT-5.2 Chat - The model powering ChatGPT
 *
 * Research sources:
 * - OpenAI documentation
 * - Optimized for natural conversation
 * - Same intelligence as GPT-5.2, different tuning
 */
export const openaiGpt52ChatProfile: ModelProfile = {
  modelId: "openai:gpt-5.2-chat",
  categoryScores: {
    coding: 88,
    reasoning: 88,
    creative: 92,
    factual: 90,
    analysis: 88,
    conversation: 95,
    multimodal: 90,
    research: 85,
  },
  strengths: [
    "Powers ChatGPT - highly refined conversational ability",
    "Excellent at creative content",
    "Strong general intelligence",
    "Good vision capabilities",
    "Natural, engaging responses",
  ],
  weaknesses: [
    "Smaller 128K context than GPT-5.2",
    "No thinking capability (vs GPT-5.2)",
    "Premium pricing tier",
    "Not as specialized for coding",
  ],
  bestFor: [
    "General conversation",
    "Creative writing and brainstorming",
    "Content creation",
    "Everyday intelligence tasks",
    "ChatGPT-like experiences",
  ],
  avoidFor: [
    "Maximum context needs (use GPT-5.2)",
    "Tasks requiring deep reasoning (use GPT-5.2)",
    "Complex coding (use Codex)",
    "Cost-sensitive applications",
  ],
  qualityScore: 90,
  speedTier: "medium",
  costTier: "premium",
  notes:
    "ChatGPT's brain. Great for general use but GPT-5.2 is better for complex reasoning, Codex for coding.",
};
