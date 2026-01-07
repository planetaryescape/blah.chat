import type { ModelProfile } from "./types";

/**
 * Qwen 3 Coder 480B - Massive coding specialist
 *
 * Research sources:
 * - Alibaba documentation
 * - 480B parameters
 * - Optimized for code
 */
export const alibabaQwen3Coder480bProfile: ModelProfile = {
	modelId: "alibaba:qwen3-coder-480b",
	categoryScores: {
		coding: 92,
		reasoning: 85,
		creative: 65,
		factual: 78,
		analysis: 80,
		conversation: 60,
		multimodal: 0,
		research: 70,
	},
	strengths: [
		"Massive 480B parameters",
		"Top-tier code generation",
		"Affordable ($0.35/M input)",
		"Good for large projects",
		"Agentic coding support",
	],
	weaknesses: [
		"Internal only",
		"No vision",
		"Specialized for coding",
		"131K context limit",
	],
	bestFor: [
		"Large-scale code generation",
		"Complex coding projects",
		"Agentic development",
		"Code-intensive workflows",
	],
	avoidFor: [
		"Public-facing use",
		"Non-coding tasks",
		"Image analysis",
		"General conversation",
	],
	qualityScore: 88,
	speedTier: "medium",
	costTier: "budget",
	notes:
		"Massive coding model. Internal use only. Excellent for complex code generation at reasonable cost.",
};
