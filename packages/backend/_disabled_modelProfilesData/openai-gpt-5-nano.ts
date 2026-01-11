import type { ModelProfile } from "./types";

/**
 * GPT-5 Nano - Smallest, fastest GPT-5 variant
 *
 * Research sources:
 * - OpenAI documentation
 * - Performance benchmarks show excellent speed
 * - Best for simple queries where latency matters
 */
export const openaiGpt5NanoProfile: ModelProfile = {
  modelId: "openai:gpt-5-nano",
  categoryScores: {
    coding: 65,
    reasoning: 55,
    creative: 60,
    factual: 75,
    analysis: 58,
    conversation: 85,
    multimodal: 0, // No vision capability
    research: 50,
  },
  strengths: [
    "Ultra-fast response times",
    "Extremely low cost ($0.04/M input)",
    "Good for simple Q&A",
    "Ideal for high-volume applications",
    "Low latency for real-time apps",
  ],
  weaknesses: [
    "Limited reasoning capabilities",
    "No vision/multimodal support",
    "Struggles with complex tasks",
    "May produce lower quality creative content",
    "Not suitable for coding beyond simple snippets",
  ],
  bestFor: [
    "Simple factual questions",
    "Quick classifications",
    "High-volume chatbots",
    "Real-time applications",
    "Cost-critical deployments",
  ],
  avoidFor: [
    "Complex coding tasks",
    "Multi-step reasoning",
    "Image analysis (no vision)",
    "Long-form content creation",
    "Research and analysis",
  ],
  qualityScore: 60,
  speedTier: "ultra-fast",
  costTier: "free", // Near-free pricing
  notes:
    "Use only for simple tasks where speed matters most. Upgrade to Mini for anything requiring real thinking.",
};
