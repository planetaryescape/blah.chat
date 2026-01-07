import type { ModelProfile } from "./types";

/**
 * GLM 4.6V Flash - Fast multimodal vision model
 *
 * Research sources:
 * - Z.ai/Zhipu documentation
 * - SOTA visual understanding
 * - Free preview pricing
 */
export const zaiGlm46vFlashProfile: ModelProfile = {
	modelId: "zai:glm-4.6v-flash",
	categoryScores: {
		coding: 70,
		reasoning: 72,
		creative: 75,
		factual: 78,
		analysis: 80,
		conversation: 75,
		multimodal: 92,
		research: 70,
	},
	strengths: [
		"Excellent visual understanding",
		"Free preview pricing",
		"Low latency",
		"Vision + function calling",
		"128K context",
	],
	weaknesses: [
		"Limited to 128K context",
		"Less capable than dedicated vision models",
		"Preview/experimental status",
	],
	bestFor: [
		"Fast image analysis",
		"Visual understanding tasks",
		"Free multimodal exploration",
		"Quick visual queries",
	],
	avoidFor: [
		"Maximum visual quality (use dedicated vision models)",
		"Long context needs",
		"Production stability requirements",
	],
	qualityScore: 78,
	speedTier: "fast",
	costTier: "free",
	notes:
		"Free vision model. Great for trying visual tasks. Use Gemini or GPT for production multimodal.",
};
