import type { ModelProfile } from "./types";

/**
 * Claude 4.5 Opus - Most capable Claude model
 *
 * Research sources:
 * - Anthropic documentation
 * - Strong coding benchmarks (HumanEval 93.7%)
 * - Extended thinking for complex reasoning
 * - User feedback: excellent for software engineering
 */
export const anthropicClaudeOpus45Profile: ModelProfile = {
	modelId: "anthropic:claude-opus-4.5",
	categoryScores: {
		coding: 95,
		reasoning: 94,
		creative: 90,
		factual: 88,
		analysis: 92,
		conversation: 82,
		multimodal: 88,
		research: 88,
	},
	strengths: [
		"Best-in-class coding capabilities",
		"Extended thinking for complex problems",
		"Excellent at autonomous agent tasks",
		"Strong vision understanding",
		"Careful, nuanced reasoning",
	],
	weaknesses: [
		"Premium pricing ($5/M input, $25/M output)",
		"Can be verbose",
		"Slower due to extended thinking",
		"200K context (vs 400K GPT-5.2)",
	],
	bestFor: [
		"Complex software engineering",
		"Autonomous coding agents",
		"Multi-step reasoning with extended thinking",
		"Code review and architecture",
		"Tasks requiring careful analysis",
	],
	avoidFor: [
		"Simple queries (too expensive)",
		"High-volume processing",
		"Quick responses needed",
		"Cost-sensitive applications",
	],
	qualityScore: 94,
	speedTier: "slow",
	costTier: "premium",
	notes:
		"Top choice for complex coding. Extended thinking is uniquely powerful. Use Sonnet for balanced tasks, Haiku for speed.",
};
