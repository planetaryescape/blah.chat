import type { ModelProfile } from "./types";

/**
 * Gemini 3 Pro Preview - Next-gen experimental flagship
 *
 * Research sources:
 * - Google AI preview release
 * - Cutting-edge reasoning capabilities
 * - Experimental - may change
 */
export const googleGemini3ProPreviewProfile: ModelProfile = {
	modelId: "google:gemini-3-pro-preview",
	categoryScores: {
		coding: 90,
		reasoning: 94,
		creative: 88,
		factual: 90,
		analysis: 92,
		conversation: 82,
		multimodal: 0, // No vision in this variant
		research: 88,
	},
	strengths: [
		"Cutting-edge reasoning capabilities",
		"Advanced thinking levels (low/medium/high)",
		"1M context window",
		"Latest Google AI research",
		"August 2025 knowledge",
	],
	weaknesses: [
		"Experimental (may change)",
		"Premium pricing ($2/M input)",
		"No vision capability",
		"Less stable than production models",
	],
	bestFor: [
		"Testing latest AI capabilities",
		"Complex reasoning research",
		"Tasks needing cutting-edge intelligence",
		"Evaluating next-gen models",
	],
	avoidFor: [
		"Production deployments",
		"Vision/multimodal tasks",
		"Stability-critical applications",
		"Cost-sensitive use",
	],
	qualityScore: 92,
	speedTier: "slow",
	costTier: "premium",
	notes:
		"Preview of next-gen Gemini. Use for experimentation. Not recommended for production until stable release.",
};
