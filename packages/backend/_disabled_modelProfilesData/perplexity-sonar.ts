import type { ModelProfile } from "./types";

/**
 * Sonar - Lightweight fast search
 *
 * Research sources:
 * - Perplexity documentation
 * - Fastest Perplexity model
 * - Best for quick searches
 */
export const perplexitySonarProfile: ModelProfile = {
  modelId: "perplexity:sonar",
  categoryScores: {
    coding: 55,
    reasoning: 60,
    creative: 60,
    factual: 85,
    analysis: 65,
    conversation: 70,
    multimodal: 0,
    research: 85,
  },
  strengths: [
    "Fastest Perplexity model",
    "Very affordable ($1/M input/output)",
    "Real-time search",
    "Low latency",
    "Good for quick lookups",
  ],
  weaknesses: [
    "No reasoning capability",
    "Limited analysis depth",
    "127K context",
    "Basic responses",
  ],
  bestFor: [
    "Quick web searches",
    "Fast fact lookups",
    "Current events queries",
    "Budget research",
  ],
  avoidFor: [
    "Complex reasoning",
    "Deep analysis",
    "Long documents",
    "Tasks not needing search",
  ],
  qualityScore: 68,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Quick and cheap web search. Use for simple lookups. Upgrade to Reasoning variants for analysis.",
};
