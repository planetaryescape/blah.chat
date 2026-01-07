import type { ModelProfile } from "./types";

/**
 * Grok 4.1 Fast Reasoning - With thinking capability
 *
 * Research sources:
 * - xAI documentation
 * - 2M context + reasoning
 * - Best of both worlds
 */
export const xaiGrok41FastReasoningProfile: ModelProfile = {
	modelId: "xai:grok-4.1-fast-reasoning",
	categoryScores: {
		coding: 85,
		reasoning: 88,
		creative: 82,
		factual: 85,
		analysis: 88,
		conversation: 82,
		multimodal: 0,
		research: 85,
	},
	strengths: [
		"2M context + thinking capability",
		"Excellent reasoning at scale",
		"Good value ($1/M input)",
		"Fast despite reasoning",
		"Great for complex agentic tasks",
	],
	weaknesses: [
		"No vision capability",
		"Slower than non-reasoning variant",
		"Less proven than GPT/Claude",
	],
	bestFor: [
		"Complex reasoning over long context",
		"High-volume thinking tasks",
		"Agentic workflows needing reasoning",
		"Cost-efficient reasoning",
	],
	avoidFor: [
		"Image analysis",
		"Ultra-low latency needs",
		"Simple tasks (overkill)",
	],
	qualityScore: 85,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Unique: 2M context + reasoning at low cost. Excellent for long-context reasoning. Competitive with more expensive models.",
};
