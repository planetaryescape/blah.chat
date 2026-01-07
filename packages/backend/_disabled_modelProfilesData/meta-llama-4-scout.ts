import type { ModelProfile } from "./types";

/**
 * Llama 4 Scout - Smaller efficient Llama 4
 *
 * Research sources:
 * - Meta documentation
 * - Efficient MoE variant
 * - Budget-friendly
 */
export const metaLlama4ScoutProfile: ModelProfile = {
	modelId: "meta:llama-4-scout",
	categoryScores: {
		coding: 75,
		reasoning: 72,
		creative: 72,
		factual: 75,
		analysis: 72,
		conversation: 78,
		multimodal: 0,
		research: 68,
	},
	strengths: [
		"Very affordable ($0.10/M input)",
		"Fast responses",
		"Open-source",
		"Good for simple tasks",
		"Efficient MoE",
	],
	weaknesses: [
		"No vision",
		"Less capable than Maverick",
		"128K context limit",
		"Basic reasoning",
	],
	bestFor: [
		"Budget open-source tasks",
		"High-volume processing",
		"Simple coding assistance",
		"Cost-critical deployments",
	],
	avoidFor: [
		"Complex reasoning",
		"Image analysis",
		"Maximum quality needs",
		"Long context",
	],
	qualityScore: 72,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Budget Llama 4. Use for simple tasks. Upgrade to Maverick for vision or more capability.",
};
