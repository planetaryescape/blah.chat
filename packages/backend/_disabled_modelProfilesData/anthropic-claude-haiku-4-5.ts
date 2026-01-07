import type { ModelProfile } from "./types";

/**
 * Claude 4.5 Haiku - Fast and cost-effective
 *
 * Research sources:
 * - Anthropic documentation
 * - Near Sonnet 4 performance on some tasks
 * - Best performance-per-dollar in Claude family
 * - 2x faster than Sonnet
 */
export const anthropicClaudeHaiku45Profile: ModelProfile = {
	modelId: "anthropic:claude-haiku-4.5",
	categoryScores: {
		coding: 82,
		reasoning: 75,
		creative: 78,
		factual: 82,
		analysis: 78,
		conversation: 88,
		multimodal: 82,
		research: 70,
	},
	strengths: [
		"Fast response times (2x faster than Sonnet)",
		"Best cost-efficiency in Claude family",
		"Good vision capabilities",
		"Strong for high-volume tasks",
		"Near-Sonnet on many benchmarks",
	],
	weaknesses: [
		"Less capable on complex reasoning",
		"No extended thinking",
		"May miss nuance in complex tasks",
		"Not ideal for hardest problems",
	],
	bestFor: [
		"High-volume processing",
		"Quick responses",
		"Cost-sensitive applications",
		"Simple to moderate coding",
		"Fast multimodal tasks",
	],
	avoidFor: [
		"Complex multi-step reasoning",
		"Tasks requiring extended thinking",
		"Maximum quality requirements",
		"Advanced software engineering",
	],
	qualityScore: 78,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Speed champion of Claude family. Surprisingly capable. Use for most tasks, upgrade to Sonnet/Opus only when needed.",
};
