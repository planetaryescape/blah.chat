import type { ModelProfile } from "./types";

/**
 * DeepSeek V3.2 - Combined thinking + tool use
 *
 * Research sources:
 * - DeepSeek documentation
 * - Successor to V3.2-Exp
 * - Balanced reasoning and tools
 */
export const deepseekDeepseekV32Profile: ModelProfile = {
	modelId: "deepseek:deepseek-v3.2",
	categoryScores: {
		coding: 82,
		reasoning: 85,
		creative: 75,
		factual: 82,
		analysis: 85,
		conversation: 78,
		multimodal: 0,
		research: 80,
	},
	strengths: [
		"Combines thinking + tool use",
		"Very affordable ($0.27/M input)",
		"Good balance of capabilities",
		"Function calling support",
		"Visible reasoning",
	],
	weaknesses: [
		"No vision",
		"128K context limit",
		"Less capable than R1 on pure reasoning",
	],
	bestFor: [
		"Reasoning with tool integration",
		"Cost-effective thinking",
		"General purpose with reasoning",
		"Agentic tasks with thinking",
	],
	avoidFor: [
		"Image analysis",
		"Maximum reasoning depth (use R1)",
		"Long context needs",
	],
	qualityScore: 84,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Best value for reasoning + tools. Use R1 for pure reasoning, V3.2 when you need tool calling too.",
};
