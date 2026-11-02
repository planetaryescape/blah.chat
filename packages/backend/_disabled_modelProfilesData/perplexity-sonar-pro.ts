import type { ModelProfile } from "./types";

/**
 * Sonar Pro - Advanced search with grounding
 *
 * Research sources:
 * - Perplexity documentation
 * - Advanced web search
 * - 200K context
 */
export const perplexitySonarProProfile: ModelProfile = {
  modelId: "perplexity:sonar-pro",
  categoryScores: {
    coding: 65,
    reasoning: 75,
    creative: 70,
    factual: 92,
    analysis: 80,
    conversation: 75,
    multimodal: 0,
    research: 95,
  },
  strengths: [
    "Advanced web search",
    "200K context window",
    "Citation grounding",
    "Current information",
    "Good for comprehensive research",
  ],
  weaknesses: [
    "Most expensive Perplexity model ($3/M input)",
    "No thinking/reasoning mode",
    "No vision",
    "Search latency",
  ],
  bestFor: [
    "Comprehensive web research",
    "Long document analysis with search",
    "Fact-checking",
    "Current events research",
  ],
  avoidFor: [
    "Offline tasks",
    "Complex reasoning (use Reasoning Pro)",
    "Image analysis",
    "Cost-sensitive use",
  ],
  qualityScore: 82,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Premium search model. Use Reasoning Pro for complex analysis, regular Sonar for quick searches.",
};
