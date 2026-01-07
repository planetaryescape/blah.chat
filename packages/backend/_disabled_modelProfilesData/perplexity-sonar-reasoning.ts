import type { ModelProfile } from "./types";

/**
 * Sonar Reasoning - Fast real-time reasoning
 *
 * Research sources:
 * - Perplexity documentation
 * - Budget-friendly reasoning with search
 */
export const perplexitySonarReasoningProfile: ModelProfile = {
	modelId: "perplexity:sonar-reasoning",
	categoryScores: {
		coding: 65,
		reasoning: 82,
		creative: 68,
		factual: 90,
		analysis: 80,
		conversation: 72,
		multimodal: 0,
		research: 92,
	},
	strengths: [
		"Reasoning + real-time search",
		"More affordable than Pro ($1/M input)",
		"Thinking capability",
		"Fast for reasoning model",
		"Good factual accuracy",
	],
	weaknesses: [
		"Smaller 127K context",
		"Less capable than Reasoning Pro",
		"No vision",
	],
	bestFor: [
		"Quick research with reasoning",
		"Affordable web-grounded analysis",
		"Fast fact-checking",
		"Budget research tasks",
	],
	avoidFor: [
		"Long documents (127K limit)",
		"Maximum reasoning depth",
		"Image analysis",
		"Complex multi-step research",
	],
	qualityScore: 80,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Best value for search + reasoning. Use for most research tasks. Upgrade to Reasoning Pro for complex analysis.",
};
