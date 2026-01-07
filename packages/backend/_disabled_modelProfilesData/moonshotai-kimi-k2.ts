import type { ModelProfile } from "./types";

/**
 * Kimi K2 - 1T MoE agentic model
 *
 * Research sources:
 * - Moonshot AI documentation
 * - 1 trillion parameters (32B active)
 * - Strong at coding and reasoning
 */
export const moonshotaiKimiK2Profile: ModelProfile = {
	modelId: "moonshotai:kimi-k2",
	categoryScores: {
		coding: 90,
		reasoning: 85,
		creative: 75,
		factual: 82,
		analysis: 85,
		conversation: 75,
		multimodal: 0,
		research: 78,
	},
	strengths: [
		"Trillion parameter scale",
		"Excellent agentic tool use",
		"Strong code synthesis",
		"Good reasoning",
		"Competitive pricing ($0.60/M input)",
	],
	weaknesses: [
		"Internal only",
		"No vision",
		"131K context limit",
		"Less proven in Western markets",
	],
	bestFor: [
		"Agentic workflows",
		"Code synthesis",
		"Tool orchestration",
		"Complex automation",
	],
	avoidFor: [
		"Public-facing use",
		"Image analysis",
		"Simple tasks",
	],
	qualityScore: 86,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Massive 1T model. Internal use only. Strong for agentic coding and tool use.",
};
