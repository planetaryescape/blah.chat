import type { ModelProfile } from "./types";

/**
 * Gemini 2.5 Pro - Most capable Google model
 *
 * Research sources:
 * - Google AI documentation
 * - 2M context window (largest available)
 * - Extended thinking for deep reasoning
 * - Strong on GPQA, MATH benchmarks
 */
export const googleGemini25ProProfile: ModelProfile = {
	modelId: "google:gemini-2.5-pro",
	categoryScores: {
		coding: 88,
		reasoning: 92,
		creative: 85,
		factual: 88,
		analysis: 94,
		conversation: 80,
		multimodal: 90,
		research: 90,
	},
	strengths: [
		"Massive 2M token context (largest)",
		"Deep thinking for complex problems",
		"Excellent at analysis and research",
		"Strong multimodal understanding",
		"Good at multi-step reasoning",
	],
	weaknesses: [
		"More expensive than Flash ($1.25/M input)",
		"Slower due to thinking depth",
		"Knowledge cutoff January 2025",
	],
	bestFor: [
		"Analyzing entire codebases or books",
		"Deep research synthesis",
		"Complex multi-step analysis",
		"Maximum context requirements",
		"Thorough document review",
	],
	avoidFor: [
		"Simple queries (use Flash)",
		"Quick responses needed",
		"Cost-sensitive high-volume tasks",
	],
	qualityScore: 92,
	speedTier: "slow",
	costTier: "standard",
	notes:
		"The 2M context is unmatched. Use when you need to process very long documents. Flash is better for speed-critical tasks.",
};
