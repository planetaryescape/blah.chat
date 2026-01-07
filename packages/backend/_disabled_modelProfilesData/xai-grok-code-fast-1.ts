import type { ModelProfile } from "./types";

/**
 * Grok Code Fast - Speedy coding assistant
 *
 * Research sources:
 * - xAI documentation
 * - Optimized for coding tasks
 * - Very affordable
 */
export const xaiGrokCodeFast1Profile: ModelProfile = {
	modelId: "xai:grok-code-fast-1",
	categoryScores: {
		coding: 85,
		reasoning: 78,
		creative: 65,
		factual: 72,
		analysis: 75,
		conversation: 65,
		multimodal: 0,
		research: 65,
	},
	strengths: [
		"Optimized for coding",
		"Very affordable ($0.50/M input)",
		"Has thinking capability",
		"Fast responses",
		"Good debugging ability",
	],
	weaknesses: [
		"No vision",
		"128K context (vs 2M for 4.1)",
		"Not ideal for non-coding tasks",
		"Less versatile",
	],
	bestFor: [
		"Quick coding assistance",
		"Debugging",
		"Code reviews",
		"Cost-efficient development",
	],
	avoidFor: [
		"Non-coding tasks",
		"Image analysis",
		"Long context needs",
		"Creative writing",
	],
	qualityScore: 80,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Budget coding specialist. Good for everyday coding. Upgrade to GPT-5.1 Codex or Claude Opus for complex software engineering.",
};
