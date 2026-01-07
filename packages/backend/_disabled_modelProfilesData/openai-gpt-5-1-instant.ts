import type { ModelProfile } from "./types";

/**
 * GPT-5.1 Instant - Fast conversational variant
 *
 * Research sources:
 * - OpenAI documentation
 * - Optimized for tone and personalization
 * - Lower latency than standard 5.1
 */
export const openaiGpt51InstantProfile: ModelProfile = {
	modelId: "openai:gpt-5.1-instant",
	categoryScores: {
		coding: 75,
		reasoning: 72,
		creative: 85,
		factual: 82,
		analysis: 75,
		conversation: 95,
		multimodal: 85,
		research: 70,
	},
	strengths: [
		"Fast response times",
		"Excellent conversational tone",
		"Strong personalization",
		"Good vision capabilities",
		"Natural, friendly responses",
	],
	weaknesses: [
		"Less capable at complex reasoning than GPT-5.1",
		"Smaller 128K context window",
		"Not ideal for technical tasks",
	],
	bestFor: [
		"Conversational AI applications",
		"Customer-facing chatbots",
		"Personalized interactions",
		"Quick Q&A with friendly tone",
		"Real-time chat applications",
	],
	avoidFor: [
		"Complex multi-step reasoning",
		"Advanced coding tasks",
		"Long document analysis",
		"Research synthesis",
	],
	qualityScore: 78,
	speedTier: "fast",
	costTier: "budget",
	notes:
		"Best for conversational UX. Friendly tone and quick responses. Use GPT-5.1 for tasks requiring deeper thinking.",
};
