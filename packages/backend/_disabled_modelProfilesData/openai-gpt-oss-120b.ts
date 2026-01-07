import type { ModelProfile } from "./types";

/**
 * GPT-OSS 120B - Capable general-purpose LLM
 *
 * Research sources:
 * - OpenAI open-source release
 * - Strong reasoning at very fast speeds via Cerebras/Groq
 * - Used internally for many operational tasks
 */
export const openaiGptOss120bProfile: ModelProfile = {
	modelId: "openai:gpt-oss-120b",
	categoryScores: {
		coding: 78,
		reasoning: 80,
		creative: 75,
		factual: 82,
		analysis: 78,
		conversation: 82,
		multimodal: 0, // No vision
		research: 72,
	},
	strengths: [
		"Excellent speed-to-capability ratio",
		"Strong controllable reasoning",
		"Fast via Cerebras/Groq/Fireworks",
		"Good for operational/internal tasks",
		"Function calling support",
	],
	weaknesses: [
		"No vision capability",
		"Not as capable as GPT-5 series",
		"131K context limit (vs 200K+ for GPT-5)",
	],
	bestFor: [
		"Fast general-purpose tasks",
		"Internal operational workflows",
		"Quick code assistance",
		"Classification and triage",
		"Speed-critical reasoning tasks",
	],
	avoidFor: [
		"Image analysis",
		"Maximum quality requirements",
		"Tasks needing >131K context",
		"Complex creative writing",
	],
	qualityScore: 78,
	speedTier: "ultra-fast",
	costTier: "budget",
	notes:
		"Workhorse model. Fast and capable enough for most tasks. Perfect for auto-router decisions due to speed + intelligence balance.",
};
