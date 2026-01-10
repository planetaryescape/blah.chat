import type { ModelProfile } from "./types";

/**
 * Sonar Reasoning Pro - DeepSeek R1 powered with real-time search
 *
 * Research sources:
 * - Perplexity documentation
 * - Real-time web search
 * - Chain-of-thought reasoning
 */
export const perplexitySonarReasoningProProfile: ModelProfile = {
  modelId: "perplexity:sonar-reasoning-pro",
  categoryScores: {
    coding: 70,
    reasoning: 88,
    creative: 72,
    factual: 95,
    analysis: 85,
    conversation: 75,
    multimodal: 0,
    research: 98,
  },
  strengths: [
    "Real-time web search integration",
    "DeepSeek R1 reasoning engine",
    "Excellent factual accuracy",
    "Citation grounding",
    "Current information access",
  ],
  weaknesses: [
    "Higher latency (search overhead)",
    "No vision capability",
    "Premium pricing ($2/M input)",
    "Not ideal for creative tasks",
  ],
  bestFor: [
    "Research requiring current information",
    "Fact-checking and verification",
    "Web-grounded reasoning",
    "Current events analysis",
    "Academic research",
  ],
  avoidFor: [
    "Offline/creative tasks",
    "Image analysis",
    "Low-latency requirements",
    "Tasks not needing search",
  ],
  qualityScore: 88,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Best for research. Real-time search + reasoning is unique. Use when you need current, verified information.",
};
