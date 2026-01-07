import type { ModelProfile } from "./types";

/**
 * Kimi K2 Thinking - Advanced thinking agent
 *
 * Research sources:
 * - Moonshot AI documentation
 * - 200-300 sequential tool calls
 * - SOTA on HLE, BrowseComp
 */
export const moonshotaiKimiK2ThinkingProfile: ModelProfile = {
	modelId: "moonshotai:kimi-k2-thinking",
	categoryScores: {
		coding: 88,
		reasoning: 92,
		creative: 75,
		factual: 85,
		analysis: 90,
		conversation: 72,
		multimodal: 0,
		research: 85,
	},
	strengths: [
		"Can make 200-300 sequential tool calls",
		"Advanced thinking/reasoning",
		"262K context window",
		"SOTA on benchmarks",
		"Complex multi-step tasks",
	],
	weaknesses: [
		"Internal only",
		"No vision",
		"Slower due to thinking",
		"Less proven ecosystem",
	],
	bestFor: [
		"Complex multi-step agentic tasks",
		"Advanced reasoning workflows",
		"Research automation",
		"Long-running agents",
	],
	avoidFor: [
		"Public-facing use",
		"Image analysis",
		"Quick responses needed",
		"Simple tasks",
	],
	qualityScore: 90,
	speedTier: "slow",
	costTier: "budget",
	notes:
		"Advanced agentic thinking. Unique ability to chain many tool calls. Internal use for complex automation.",
};
