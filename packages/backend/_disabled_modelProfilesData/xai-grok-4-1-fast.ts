import type { ModelProfile } from "./types";

/**
 * Grok 4.1 Fast - Best agentic tool-calling model
 *
 * Research sources:
 * - xAI documentation
 * - Massive 2M context window
 * - Optimized for tool use
 */
export const xaiGrok41FastProfile: ModelProfile = {
	modelId: "xai:grok-4.1-fast",
	categoryScores: {
		coding: 80,
		reasoning: 75,
		creative: 82,
		factual: 82,
		analysis: 85,
		conversation: 88,
		multimodal: 0,
		research: 80,
	},
	strengths: [
		"Massive 2M token context (huge)",
		"Excellent tool/function calling",
		"Good value ($1/M input)",
		"Fast responses",
		"Great for agentic workflows",
	],
	weaknesses: [
		"No vision capability",
		"No thinking mode (see reasoning variant)",
		"Less capable than GPT-5 on hard problems",
	],
	bestFor: [
		"Processing very long documents",
		"Agentic tool-use workflows",
		"Long conversation history",
		"Cost-effective long context",
	],
	avoidFor: [
		"Image analysis",
		"Complex reasoning (use reasoning variant)",
		"Maximum quality needs",
	],
	qualityScore: 80,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"The 2M context is exceptional. Best for long documents and agentic workflows. Add reasoning variant for thinking capability.",
};
