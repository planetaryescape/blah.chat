import type { ModelProfile } from "./types";

/**
 * Mistral Large 3 - Most capable Mistral model
 *
 * Research sources:
 * - Mistral documentation
 * - 675B total params (41B active via MoE)
 * - European alternative
 */
export const mistralMistralLarge3Profile: ModelProfile = {
  modelId: "mistral:mistral-large-3",
  categoryScores: {
    coding: 82,
    reasoning: 80,
    creative: 78,
    factual: 82,
    analysis: 80,
    conversation: 80,
    multimodal: 82,
    research: 75,
  },
  strengths: [
    "Vision capability",
    "256K context window",
    "Competitive pricing ($0.50/M input)",
    "European data residency option",
    "Strong function calling",
  ],
  weaknesses: [
    "Less capable than GPT-5/Claude top models",
    "Smaller ecosystem",
    "Less community support",
  ],
  bestFor: [
    "European data residency requirements",
    "General purpose with vision",
    "Cost-effective multimodal",
    "Privacy-conscious deployments",
  ],
  avoidFor: ["Maximum capability needs", "Tasks requiring top-tier reasoning"],
  qualityScore: 80,
  speedTier: "medium",
  costTier: "budget",
  notes:
    "Good European alternative. Solid all-around performance. Use when EU data residency matters.",
};
