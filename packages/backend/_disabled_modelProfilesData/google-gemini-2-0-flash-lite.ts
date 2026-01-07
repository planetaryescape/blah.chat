import type { ModelProfile } from "./types";

/**
 * Gemini 2.0 Flash Lite - Ultra-cost-optimized
 *
 * Research sources:
 * - Google AI documentation
 * - Cheapest Gemini model
 * - Best for simple high-volume tasks
 */
export const googleGemini20FlashLiteProfile: ModelProfile = {
	modelId: "google:gemini-2.0-flash-lite",
	categoryScores: {
		coding: 60,
		reasoning: 55,
		creative: 60,
		factual: 70,
		analysis: 58,
		conversation: 75,
		multimodal: 75,
		research: 50,
	},
	strengths: [
		"Ultra-low cost ($0.0375/M input)",
		"1M context window",
		"Basic vision support",
		"Very fast",
		"Great for simple tasks at scale",
	],
	weaknesses: [
		"Limited capability",
		"No thinking",
		"Not for complex tasks",
		"Lower quality outputs",
	],
	bestFor: [
		"Maximum cost efficiency",
		"High-volume simple tasks",
		"Basic multimodal queries",
		"Cost-critical deployments",
		"Simple classifications",
	],
	avoidFor: [
		"Complex reasoning",
		"Quality-critical tasks",
		"Advanced coding",
		"Research and analysis",
	],
	qualityScore: 58,
	speedTier: "ultra-fast",
	costTier: "free", // Near-free pricing
	notes:
		"Cheapest multimodal option. Only for simple tasks. Upgrade to 2.0 Flash for anything more complex.",
};
