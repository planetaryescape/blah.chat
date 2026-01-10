import type { ModelProfile } from "./types";

/**
 * Claude 4.5 Sonnet - Balanced performance and speed
 *
 * Research sources:
 * - Anthropic documentation
 * - Excellent value: near-Opus performance, lower cost
 * - Strong computer use capabilities
 * - Popular choice for everyday Claude usage
 */
export const anthropicClaudeSonnet45Profile: ModelProfile = {
  modelId: "anthropic:claude-sonnet-4.5",
  categoryScores: {
    coding: 90,
    reasoning: 88,
    creative: 88,
    factual: 86,
    analysis: 88,
    conversation: 85,
    multimodal: 86,
    research: 82,
  },
  strengths: [
    "Excellent balance of capability and cost",
    "Strong coding performance",
    "Good vision capabilities",
    "Extended thinking support",
    "Computer use capability",
  ],
  weaknesses: [
    "Not quite Opus-level for hardest problems",
    "Still moderately expensive ($3/M input)",
    "Can be verbose on simple tasks",
  ],
  bestFor: [
    "Everyday coding assistance",
    "Balanced general tasks",
    "Computer use and automation",
    "Content creation",
    "Most tasks where Haiku isn't enough",
  ],
  avoidFor: [
    "Absolute maximum coding quality (use Opus)",
    "High-volume simple tasks (use Haiku)",
    "Ultra-low latency needs",
  ],
  qualityScore: 88,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Best value Claude model. Strong at most tasks. Use Opus for hardest coding, Haiku for speed/cost.",
};
