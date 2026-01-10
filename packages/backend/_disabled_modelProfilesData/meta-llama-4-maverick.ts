import type { ModelProfile } from "./types";

/**
 * Llama 4 Maverick - Largest Llama 4 MoE model
 *
 * Research sources:
 * - Meta documentation
 * - MoE architecture
 * - Vision + coding capabilities
 */
export const metaLlama4MaverickProfile: ModelProfile = {
  modelId: "meta:llama-4-maverick",
  categoryScores: {
    coding: 88,
    reasoning: 85,
    creative: 80,
    factual: 82,
    analysis: 85,
    conversation: 82,
    multimodal: 85,
    research: 78,
  },
  strengths: [
    "Largest open Llama 4 model",
    "Vision capability",
    "Strong coding",
    "MoE efficiency",
    "Fast via Cerebras/Groq",
  ],
  weaknesses: [
    "128K context limit",
    "Newer (less battle-tested)",
    "MoE can be unpredictable",
  ],
  bestFor: [
    "Advanced open-source coding",
    "Multimodal tasks with open model",
    "Fast inference needs",
    "Open-source requirement + vision",
  ],
  avoidFor: [
    "Long context needs",
    "Production stability requirements",
    "Maximum capability needs",
  ],
  qualityScore: 85,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Next-gen Llama with vision. Best open-source option for multimodal. Fast via accelerated hosts.",
};
