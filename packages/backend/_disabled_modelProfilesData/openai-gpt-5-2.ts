import type { ModelProfile } from "./types";

/**
 * GPT-5.2 - OpenAI's most intelligent model
 *
 * Research sources:
 * - OpenAI December 2025 release
 * - 400K context window (largest)
 * - Best performance on reasoning benchmarks
 */
export const openaiGpt52Profile: ModelProfile = {
	modelId: "openai:gpt-5.2",
	categoryScores: {
		coding: 92,
		reasoning: 96,
		creative: 90,
		factual: 92,
		analysis: 95,
		conversation: 80,
		multimodal: 93,
		research: 92,
	},
	strengths: [
		"Most intelligent OpenAI model",
		"Massive 400K context window",
		"Exceptional at complex reasoning",
		"Deep thinking for hard problems",
		"Best for agentic workflows",
	],
	weaknesses: [
		"Premium pricing ($1.75/M input, $14/M output)",
		"Slower due to depth of reasoning",
		"Overkill for simple tasks",
		"Knowledge cutoff April 2025",
	],
	bestFor: [
		"Most complex reasoning challenges",
		"Massive document analysis (400K context)",
		"Deep research synthesis",
		"Complex agentic workflows",
		"Tasks requiring maximum intelligence",
	],
	avoidFor: [
		"Simple queries (massive overkill)",
		"Cost-sensitive applications",
		"Low-latency requirements",
		"Casual conversation",
	],
	qualityScore: 96,
	speedTier: "slow",
	costTier: "premium",
	notes:
		"Reserve for the hardest problems. The 400K context is unique - use when you need to process very long documents. Cost is high but so is capability.",
};
