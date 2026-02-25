import {
  MODEL_CONFIG,
  MODEL_PROFILES,
  type ModelConfigForRouter,
  type ModelProfile,
  type RouterPreferences,
  type TaskClassification,
} from "./profiles";
import type { ModelRegistry } from "./registry";

export type CostTier = "cheap" | "mid" | "premium";

export type ScoredModel = { modelId: string; score: number };

export const TIER_WEIGHTS: Record<
  TaskClassification["complexity"],
  Record<CostTier, number>
> = {
  simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
  moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
  complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
};

export function getCostTier(pricing: {
  input: number;
  output: number;
}): CostTier {
  const avgCost = (pricing.input + pricing.output) / 2;
  if (avgCost < 1.0) return "cheap";
  if (avgCost < 5.0) return "mid";
  return "premium";
}

function resolveModels(
  registry?: ModelRegistry,
): Record<string, ModelConfigForRouter> {
  return registry?.models ?? MODEL_CONFIG;
}

function resolveProfiles(
  registry?: ModelRegistry,
): Record<string, ModelProfile> {
  return registry?.profiles ?? MODEL_PROFILES;
}

export function getEligibleModels(
  classification: TaskClassification,
  currentContextTokens: number,
  excludedModels?: string[],
  registry?: ModelRegistry,
): string[] {
  const models = resolveModels(registry);
  return Object.keys(models).filter((modelId) => {
    const config = models[modelId];

    if (excludedModels?.includes(modelId)) return false;
    if (config.isInternalOnly) return false;
    if (config.contextWindow < currentContextTokens * 1.2) return false;

    if (
      classification.requiresVision &&
      !config.capabilities.includes("vision")
    ) {
      return false;
    }

    if (classification.requiresLongContext && config.contextWindow < 128000) {
      return false;
    }

    if (
      config.capabilities.includes("image-generation") &&
      classification.primaryCategory !== "multimodal"
    ) {
      return false;
    }

    return true;
  });
}

export function getSpeedBonus(
  modelId: string,
  registry?: ModelRegistry,
): number {
  const models = resolveModels(registry);
  const config = models[modelId];
  if (!config) return 0;

  if (config.hostOrder?.includes("cerebras")) return 12;
  if (config.hostOrder?.includes("groq")) return 10;

  if (modelId.includes("flash") || modelId.includes("fast")) return 8;
  if (modelId.includes("nano") || modelId.includes("lite")) return 10;
  if (modelId.includes("lightning")) return 12;

  if (config.capabilities.includes("thinking")) return -5;
  if (config.capabilities.includes("extended-thinking")) return -8;

  return 0;
}

export function scoreModels(
  modelIds: string[],
  classification: TaskClassification,
  preferences: RouterPreferences,
  previousSelectedModel?: string,
  registry?: ModelRegistry,
): ScoredModel[] {
  const models = resolveModels(registry);
  const profiles = resolveProfiles(registry);

  return modelIds
    .map((modelId) => {
      const config = models[modelId];
      const profile = profiles[modelId];

      let score = 50;

      if (profile?.categoryScores) {
        score = profile.categoryScores[classification.primaryCategory] ?? 50;

        if (
          classification.secondaryCategory &&
          profile.categoryScores[classification.secondaryCategory]
        ) {
          score +=
            (profile.categoryScores[classification.secondaryCategory] ?? 0) *
            0.3;
        }
      }

      if (classification.complexity === "simple") {
        score *= 0.7;
      } else if (
        classification.complexity === "complex" &&
        profile?.qualityScore &&
        profile.qualityScore >= 85
      ) {
        score *= 1.2;
      }

      const avgCost = (config.pricing.input + config.pricing.output) / 2;
      const costPenalty = (avgCost / 30) * (preferences.costBias / 100) * 20;
      score -= costPenalty;

      score += getSpeedBonus(modelId, registry) * (preferences.speedBias / 100);

      if (previousSelectedModel && modelId === previousSelectedModel) {
        score += 25;
      }

      if (
        classification.requiresReasoning &&
        (config.capabilities.includes("thinking") ||
          config.capabilities.includes("extended-thinking"))
      ) {
        score += 15;
      }

      if (
        classification.primaryCategory === "research" &&
        modelId.startsWith("perplexity:")
      ) {
        score += 25;
      }

      score = Math.max(score, 10);
      return { modelId, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function selectWithExploration(
  scoredModels: ScoredModel[],
  classification: Pick<TaskClassification, "complexity" | "isHighStakes">,
  random: () => number = Math.random,
  registry?: ModelRegistry,
): ScoredModel & { explorationPick: boolean } {
  if (scoredModels.length === 0) {
    throw new Error("No scored models to select from");
  }

  const models = resolveModels(registry);
  const sorted = [...scoredModels].sort((a, b) => b.score - a.score);
  const tiers: Record<CostTier, ScoredModel[]> = {
    cheap: [],
    mid: [],
    premium: [],
  };

  for (const model of sorted) {
    const config = models[model.modelId];
    if (!config) continue;
    const tier = getCostTier(config.pricing);
    tiers[tier].push(model);
  }

  if (classification.isHighStakes) {
    if (tiers.premium.length > 0) {
      const picked = tiers.premium[Math.floor(random() * tiers.premium.length)];
      return { ...picked, explorationPick: false };
    }
    return { ...sorted[0], explorationPick: false };
  }

  const weights =
    TIER_WEIGHTS[classification.complexity] ?? TIER_WEIGHTS.simple;
  const roll = random();
  let selectedTier: CostTier;
  let explorationPick = false;

  if (roll < weights.cheap && tiers.cheap.length > 0) {
    selectedTier = "cheap";
  } else if (roll < weights.cheap + weights.mid && tiers.mid.length > 0) {
    selectedTier = "mid";
    explorationPick = true;
  } else if (tiers.premium.length > 0) {
    selectedTier = "premium";
    explorationPick = true;
  } else if (tiers.mid.length > 0) {
    selectedTier = "mid";
    explorationPick = true;
  } else {
    return { ...sorted[0], explorationPick: false };
  }

  const pool = tiers[selectedTier];
  const picked = pool[Math.floor(random() * pool.length)];
  return { ...picked, explorationPick };
}
