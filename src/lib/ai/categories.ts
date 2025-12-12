import {
  Brain,
  Code,
  DollarSign,
  Eye,
  Gift,
  Globe,
  Sparkles,
  Zap,
} from "lucide-react";
import { computeModelMetrics, getBenchmarkScores } from "./benchmarks";
import type { ModelConfig } from "./models";
import type { ModelCategory } from "./types";

/**
 * Category definitions for filtering models
 * Each category has:
 * - id: unique identifier
 * - label: display name
 * - icon: Lucide icon component
 * - filter: function to determine if model belongs to category
 * - description: tooltip text
 */
export const MODEL_CATEGORIES: ModelCategory[] = [
  {
    id: "all",
    label: "All Models",
    filter: () => true,
    description: "All available models",
  },
  {
    id: "free",
    label: "Free",
    icon: Gift,
    filter: (model: ModelConfig) =>
      model.pricing.input === 0 && model.pricing.output === 0,
    description: "Completely free to use",
  },
  {
    id: "speed",
    label: "Speed",
    icon: Zap,
    filter: (model: ModelConfig) => {
      const metrics = computeModelMetrics(model);
      return metrics.speedTier === "ultra-fast" || metrics.speedTier === "fast";
    },
    description: "Fast models for quick answers and simple tasks",
  },
  {
    id: "budget",
    label: "Budget",
    icon: DollarSign,
    filter: (model: ModelConfig) => {
      const metrics = computeModelMetrics(model);
      return metrics.costTier === "budget";
    },
    description: "Cost-effective for high-volume use",
  },
  {
    id: "coding",
    label: "Coding",
    icon: Code,
    filter: (model: ModelConfig) => {
      const scores = getBenchmarkScores(model);
      return (scores.coding ?? 0) >= 70;
    },
    description: "Best for software development tasks",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    icon: Sparkles,
    filter: (model: ModelConfig) =>
      model.capabilities.includes("extended-thinking") ||
      model.capabilities.includes("thinking"),
    description: "Deep thinking for complex problems (slower/pricier)",
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Brain,
    filter: (model: ModelConfig) => {
      const scores = getBenchmarkScores(model);
      return (scores.intelligence ?? 0) >= 85;
    },
    description: "Highest capability for sophisticated tasks (expensive)",
  },
  {
    id: "vision",
    label: "Vision",
    icon: Eye,
    filter: (model: ModelConfig) => model.capabilities.includes("vision"),
    description: "Image analysis and multimodal understanding",
  },
  {
    id: "web-search",
    label: "Web Search",
    icon: Globe,
    filter: (model: ModelConfig) =>
      model.provider === "perplexity" ||
      (model.knowledgeCutoff?.includes("Real-time") ?? false),
    description: "Real-time internet access",
  },
];

/**
 * Get all category IDs that a model belongs to
 * Excludes "all" category
 *
 * @param model - Model configuration to categorize
 * @returns Array of category IDs (e.g., ["speed", "coding"])
 */
export function getModelCategories(model: ModelConfig): string[] {
  return MODEL_CATEGORIES.filter(
    (cat) => cat.id !== "all" && cat.filter(model),
  ).map((cat) => cat.id);
}

/**
 * Count how many models belong to a specific category
 *
 * @param categoryId - Category ID to count
 * @param allModels - Full list of models to check
 * @returns Number of models in category
 */
export function countModelsInCategory(
  categoryId: string,
  allModels: ModelConfig[],
): number {
  const category = MODEL_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return 0;
  return allModels.filter(category.filter).length;
}
