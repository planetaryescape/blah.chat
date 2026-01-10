import type { ModelProfile } from "./types";

/**
 * Llama 3.3 70B - Enhanced reasoning open-source model
 *
 * Research sources:
 * - Meta documentation
 * - Strong benchmarks (HumanEval 87.6%)
 * - Popular for self-hosting
 */
export const metaLlama3370bProfile: ModelProfile = {
  modelId: "meta:llama-3.3-70b",
  categoryScores: {
    coding: 85,
    reasoning: 82,
    creative: 78,
    factual: 80,
    analysis: 80,
    conversation: 82,
    multimodal: 0,
    research: 75,
  },
  strengths: [
    "Open-source (can self-host)",
    "Strong coding performance",
    "Multilingual support (8 languages)",
    "Fast via Cerebras/Groq",
    "Good function calling",
  ],
  weaknesses: [
    "No vision capability",
    "128K context limit",
    "Internal only (not public facing)",
    "Less capable than largest models",
  ],
  bestFor: [
    "Self-hosted deployments",
    "Multilingual tasks",
    "Cost-conscious coding",
    "Open-source requirements",
  ],
  avoidFor: [
    "Image analysis",
    "Public-facing use (internal only)",
    "Maximum capability needs",
  ],
  qualityScore: 82,
  speedTier: "fast",
  costTier: "budget",
  notes:
    "Excellent open-source option. Fast via Cerebras/Groq. Use for internal tasks where open-source matters.",
};
