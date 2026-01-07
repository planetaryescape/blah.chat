import type { ModelProfile } from "./types";

/**
 * Kimi K2 (OpenRouter Free) - Free 1T param model
 *
 * Research sources:
 * - OpenRouter free tier
 * - Moonshot's trillion parameter MoE
 */
export const openrouterKimiK2Profile: ModelProfile = {
	modelId: "openrouter:kimi-k2",
	categoryScores: {
		coding: 85,
		reasoning: 82,
		creative: 72,
		factual: 78,
		analysis: 80,
		conversation: 72,
		multimodal: 0,
		research: 75,
	},
	strengths: [
		"Completely free",
		"Trillion parameter scale",
		"Strong coding and reasoning",
		"Good for experimentation",
	],
	weaknesses: [
		"Smaller 32K context (vs 131K direct)",
		"No capabilities (basic)",
		"No vision",
		"Free tier limits",
	],
	bestFor: [
		"Free large-scale experimentation",
		"Cost-free coding tasks",
		"Exploring trillion param models",
		"Budget reasoning",
	],
	avoidFor: [
		"Long context needs",
		"Image analysis",
		"Production tasks",
	],
	qualityScore: 80,
	speedTier: "medium",
	costTier: "free",
	notes:
		"Free trillion param model. Limited 32K context. Use direct Kimi for full features.",
};
