import type { ModelProfile } from "./types";

/**
 * DeepSeek R1 0528 (OpenRouter Free) - Free 671B reasoning
 *
 * Research sources:
 * - OpenRouter free tier
 * - May 2025 DeepSeek release
 * - Zero cost
 */
export const openrouterDeepseekR10528Profile: ModelProfile = {
  modelId: "openrouter:deepseek-r1-0528",
  categoryScores: {
    coding: 85,
    reasoning: 94,
    creative: 72,
    factual: 85,
    analysis: 90,
    conversation: 68,
    multimodal: 0,
    research: 88,
  },
  strengths: [
    "Completely free",
    "671B parameter reasoning",
    "Visible chain-of-thought",
    "163K context window",
    "May 2025 knowledge",
  ],
  weaknesses: [
    "No vision",
    "Free tier may have limits",
    "Via OpenRouter (indirect)",
  ],
  bestFor: [
    "Cost-free complex reasoning",
    "Experimentation with reasoning",
    "Learning from visible thinking",
    "Budget-constrained research",
  ],
  avoidFor: [
    "Image analysis",
    "Production reliability needs",
    "High-volume critical tasks",
  ],
  qualityScore: 90,
  speedTier: "medium",
  costTier: "free",
  notes:
    "Free access to powerful reasoning. Great for experimentation. Use direct DeepSeek for production.",
};
