import type { ModelProfile } from "./types";

/**
 * Qwen 3 Max - SOTA agent and tool invocation
 *
 * Research sources:
 * - Alibaba documentation
 * - Specialized for agentic scenarios
 * - Strong thinking capability
 */
export const alibabaQwen3MaxProfile: ModelProfile = {
  modelId: "alibaba:qwen3-max",
  categoryScores: {
    coding: 88,
    reasoning: 90,
    creative: 78,
    factual: 85,
    analysis: 88,
    conversation: 78,
    multimodal: 0,
    research: 82,
  },
  strengths: [
    "State-of-the-art agentic capability",
    "Excellent tool invocation",
    "Thinking capability",
    "262K context window",
    "Complex workflow handling",
  ],
  weaknesses: [
    "No vision",
    "Moderate pricing ($1.2/M input)",
    "Less proven in Western markets",
  ],
  bestFor: [
    "Complex agentic workflows",
    "Multi-tool orchestration",
    "Advanced automation",
    "Long-context tool use",
  ],
  avoidFor: ["Image analysis", "Simple tasks", "Maximum stability needs"],
  qualityScore: 88,
  speedTier: "medium",
  costTier: "standard",
  notes:
    "Top agentic model. Excellent at complex tool use. Consider for sophisticated automation workflows.",
};
