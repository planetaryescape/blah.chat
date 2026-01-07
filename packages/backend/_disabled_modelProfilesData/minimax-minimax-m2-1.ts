import type { ModelProfile } from "./types";

/**
 * MiniMax M2.1 - Optimized for coding and planning
 *
 * Research sources:
 * - MiniMax documentation
 * - Improved instruction following
 * - Long-horizon planning
 */
export const minimaxMinimaxM21Profile: ModelProfile = {
	modelId: "minimax:minimax-m2.1",
	categoryScores: {
		coding: 90,
		reasoning: 85,
		creative: 75,
		factual: 82,
		analysis: 85,
		conversation: 78,
		multimodal: 0,
		research: 78,
	},
	strengths: [
		"Improved over M2",
		"Excellent instruction following",
		"Long-horizon planning",
		"205K context",
		"Same affordable pricing",
	],
	weaknesses: [
		"No vision",
		"Smaller ecosystem",
	],
	bestFor: [
		"Complex coding projects",
		"Long-horizon planning",
		"Instruction-heavy tasks",
		"Agentic workflows",
	],
	avoidFor: [
		"Image analysis",
		"Maximum capability needs",
	],
	qualityScore: 86,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Improved M2. Better for complex tasks. Use Lightning variant for speed-critical needs.",
};
