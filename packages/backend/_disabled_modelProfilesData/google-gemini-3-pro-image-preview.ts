import type { ModelProfile } from "./types";

/**
 * Gemini 3 Pro Image Preview - Image generation model
 *
 * Research sources:
 * - Google AI preview release
 * - Text-to-image generation
 * - Vision understanding + generation
 */
export const googleGemini3ProImagePreviewProfile: ModelProfile = {
	modelId: "google:gemini-3-pro-image-preview",
	categoryScores: {
		coding: 50,
		reasoning: 70,
		creative: 92,
		factual: 65,
		analysis: 70,
		conversation: 60,
		multimodal: 95,
		research: 55,
	},
	strengths: [
		"Image generation capability",
		"Strong visual understanding",
		"Creative visual outputs",
		"Thinking for image planning",
		"Can understand AND create images",
	],
	weaknesses: [
		"Expensive output ($120/M output)",
		"Limited 65K context",
		"Experimental",
		"Not optimized for text-only tasks",
	],
	bestFor: [
		"Image generation from text",
		"Visual creativity tasks",
		"Design prototyping",
		"Image understanding + generation",
		"Creative visual workflows",
	],
	avoidFor: [
		"Text-only tasks",
		"Complex reasoning",
		"Coding",
		"Cost-sensitive applications",
		"Long context needs",
	],
	qualityScore: 80,
	speedTier: "medium",
	costTier: "premium",
	notes:
		"Unique image generation capability. Use specifically for visual creation tasks. Very expensive for output.",
};
