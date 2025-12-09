import type { LucideIcon } from "lucide-react";
import { Eye, Sparkles, Zap } from "lucide-react";
import { getModelConfig } from "./utils";

/**
 * Get appropriate icon for a model based on its capabilities
 * - Vision models: Eye icon
 * - Thinking/reasoning models: Sparkles icon
 * - Default (fast models): Zap icon
 */
export function getModelIcon(modelId: string): LucideIcon {
  const config = getModelConfig(modelId);
  if (!config) return Sparkles;

  if (config.capabilities.includes("vision")) return Eye;
  if (
    config.capabilities.includes("thinking") ||
    config.capabilities.includes("extended-thinking")
  )
    return Sparkles;

  return Zap; // Default for fast models
}

/**
 * Get capability hints for a model to show to users
 * Returns array of hint strings describing model capabilities
 * - Shows vision support
 * - Shows thinking/reasoning support
 * - Shows large context window (>100K tokens)
 */
export function getModelCapabilityHints(modelId: string): string[] {
  const config = getModelConfig(modelId);
  if (!config) return [];

  const hints: string[] = [];

  if (config.capabilities.includes("vision")) {
    hints.push("This model can analyze images");
  }

  if (config.reasoning) {
    hints.push("Extended reasoning enabled");
  }

  if (config.contextWindow > 100000) {
    hints.push(`${(config.contextWindow / 1000).toFixed(0)}K context window`);
  }

  return hints;
}
