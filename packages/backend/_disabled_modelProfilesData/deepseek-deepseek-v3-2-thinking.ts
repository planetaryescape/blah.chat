import type { ModelProfile } from "./types";

/**
 * DeepSeek V3.2 Thinking - Pure reasoning mode
 *
 * Research sources:
 * - DeepSeek documentation
 * - Focused on reasoning without tools
 */
export const deepseekDeepseekV32ThinkingProfile: ModelProfile = {
	modelId: "deepseek:deepseek-v3.2-thinking",
	categoryScores: {
		coding: 80,
		reasoning: 88,
		creative: 72,
		factual: 82,
		analysis: 88,
		conversation: 72,
		multimodal: 0,
		research: 82,
	},
	strengths: [
		"Pure reasoning focus",
		"Visible chain-of-thought",
		"Very affordable ($0.27/M input)",
		"No tool distractions",
		"Good for complex analysis",
	],
	weaknesses: [
		"No function calling",
		"No vision",
		"Less versatile than V3.2",
		"128K context limit",
	],
	bestFor: [
		"Pure reasoning tasks",
		"Complex analysis without tools",
		"Thought-intensive problems",
		"Learning from visible reasoning",
	],
	avoidFor: [
		"Tasks needing tools",
		"Image analysis",
		"Maximum reasoning (use R1)",
	],
	qualityScore: 85,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Pure reasoning variant. Use when you want focused thinking without tool use.",
};
