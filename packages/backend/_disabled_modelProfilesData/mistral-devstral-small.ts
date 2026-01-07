import type { ModelProfile } from "./types";

/**
 * Mistral Devstral Small - Agentic coding specialist
 *
 * Research sources:
 * - Mistral documentation
 * - Optimized for software engineering
 * - Very affordable
 */
export const mistralDevstralSmallProfile: ModelProfile = {
	modelId: "mistral:devstral-small",
	categoryScores: {
		coding: 85,
		reasoning: 75,
		creative: 65,
		factual: 72,
		analysis: 72,
		conversation: 65,
		multimodal: 0,
		research: 65,
	},
	strengths: [
		"Optimized for agentic coding",
		"Very affordable ($0.10/M input)",
		"Good function calling",
		"128K context",
		"European alternative for coding",
	],
	weaknesses: [
		"No vision",
		"Specialized for coding only",
		"Less versatile",
	],
	bestFor: [
		"Agentic coding tasks",
		"Software development",
		"Cost-efficient coding assistance",
		"European coding deployments",
	],
	avoidFor: [
		"Non-coding tasks",
		"Image analysis",
		"General conversation",
		"Creative writing",
	],
	qualityScore: 78,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Budget coding specialist from Mistral. Good for straightforward coding. Upgrade to Claude Opus for complex engineering.",
};
