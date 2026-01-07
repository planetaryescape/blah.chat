import type { ModelProfile } from "./types";

/**
 * GLM-4.5 Air (OpenRouter Free) - Free lightweight agent
 *
 * Research sources:
 * - OpenRouter free tier
 * - Z.ai's agent model
 */
export const openrouterGlm45AirProfile: ModelProfile = {
	modelId: "openrouter:glm-4.5-air",
	categoryScores: {
		coding: 75,
		reasoning: 75,
		creative: 70,
		factual: 75,
		analysis: 72,
		conversation: 75,
		multimodal: 0,
		research: 68,
	},
	strengths: [
		"Completely free",
		"Thinking capability",
		"Function calling",
		"131K context",
		"Agent-focused design",
	],
	weaknesses: [
		"No vision",
		"Less capable than paid models",
		"Free tier limits may apply",
	],
	bestFor: [
		"Free agentic experimentation",
		"Cost-free tool calling",
		"Learning agent patterns",
		"Budget automation",
	],
	avoidFor: [
		"Image analysis",
		"Production requirements",
		"Complex reasoning",
	],
	qualityScore: 72,
	speedTier: "fast",
	costTier: "free",
	notes:
		"Free agent model with thinking. Good for experimentation. Use paid models for production.",
};
