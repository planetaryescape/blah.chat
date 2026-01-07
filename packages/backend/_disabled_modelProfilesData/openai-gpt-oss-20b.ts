import type { ModelProfile } from "./types";

/**
 * GPT-OSS 20B - Compact MoE for ultra-low latency
 *
 * Research sources:
 * - OpenAI open-source release
 * - 1000+ tokens/sec via Cerebras/Groq
 * - Optimized for edge and real-time applications
 */
export const openaiGptOss20bProfile: ModelProfile = {
	modelId: "openai:gpt-oss-20b",
	categoryScores: {
		coding: 60,
		reasoning: 55,
		creative: 55,
		factual: 68,
		analysis: 55,
		conversation: 75,
		multimodal: 0, // No vision
		research: 45,
	},
	strengths: [
		"Blazing fast (1000+ tokens/sec)",
		"Ultra-low cost",
		"Has thinking capability despite small size",
		"Function calling support",
		"Great for real-time applications",
	],
	weaknesses: [
		"Limited capability vs larger models",
		"No vision support",
		"Not suitable for complex reasoning",
		"Can produce lower quality outputs",
	],
	bestFor: [
		"Real-time applications",
		"Low-latency chatbots",
		"Edge deployments",
		"Simple tool calling",
		"Cost-critical high-volume tasks",
	],
	avoidFor: [
		"Complex reasoning",
		"Image analysis",
		"Long-form content",
		"Advanced coding",
		"Research tasks",
	],
	qualityScore: 55,
	speedTier: "ultra-fast",
	costTier: "budget",
	notes:
		"Speed demon. Use when latency matters more than capability. Cerebras/Groq hosts make it incredibly fast.",
};
