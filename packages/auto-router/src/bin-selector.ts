/**
 * Bin Selector
 *
 * Given a route label + constraints, selects the best model from the bin.
 * Handles capability filtering, user preferences, sticky routing, and fallbacks.
 */

import { ROUTE_BINS } from "./bins";
import {
  MODEL_CONFIG,
  type ModelConfigForRouter,
  type RouterPreferences,
} from "./profiles";
import type { ModelRegistry } from "./registry";
import type { ModelBin, RouteLabel } from "./types";

export interface BinSelectionInput {
  routeLabel: RouteLabel;
  preferences: RouterPreferences;
  previousModelId?: string;
  previousRouteLabel?: RouteLabel;
  excludedModels?: string[];
  currentContextTokens?: number;
  requiresVision?: boolean;
  contextBuffer?: number;
  registry?: ModelRegistry;
  fallbackModelId?: string;
}

interface BinSelectionResult {
  modelId: string;
  candidatesConsidered: number;
  isSticky: boolean;
  candidateModels: string[];
}

function resolveModels(
  registry?: ModelRegistry,
): Record<string, ModelConfigForRouter> {
  return registry?.models ?? MODEL_CONFIG;
}

function resolveBins(registry?: ModelRegistry): Record<RouteLabel, ModelBin> {
  return registry?.bins ?? ROUTE_BINS;
}

function isModelEligible(
  modelId: string,
  input: BinSelectionInput,
  models: Record<string, ModelConfigForRouter>,
): boolean {
  const config = models[modelId];
  if (!config) return false;
  if (config.isInternalOnly) return false;
  if (input.excludedModels?.includes(modelId)) return false;

  if (
    input.currentContextTokens &&
    config.contextWindow <
      input.currentContextTokens * (input.contextBuffer ?? 1.2)
  ) {
    return false;
  }

  if (input.requiresVision && !config.capabilities.includes("vision")) {
    return false;
  }

  return true;
}

function sortByCostSpeedPreference(
  modelIds: string[],
  preferences: RouterPreferences,
  models: Record<string, ModelConfigForRouter>,
): string[] {
  return [...modelIds].sort((a, b) => {
    const configA = models[a];
    const configB = models[b];
    if (!configA || !configB) return 0;

    const avgCostA = (configA.pricing.input + configA.pricing.output) / 2;
    const avgCostB = (configB.pricing.input + configB.pricing.output) / 2;

    const costWeight = (preferences.costBias - 50) / 50;
    const speedWeight = (preferences.speedBias - 50) / 50;

    const costDiff = (avgCostA - avgCostB) * costWeight;

    const speedA =
      configA.hostOrder?.includes("cerebras") ||
      configA.hostOrder?.includes("groq")
        ? -1
        : 0;
    const speedB =
      configB.hostOrder?.includes("cerebras") ||
      configB.hostOrder?.includes("groq")
        ? -1
        : 0;
    const speedDiff = (speedA - speedB) * speedWeight;

    return costDiff + speedDiff;
  });
}

export function selectFromBin(input: BinSelectionInput): BinSelectionResult {
  const models = resolveModels(input.registry);
  const bins = resolveBins(input.registry);
  const bin = bins[input.routeLabel];

  if (!bin) {
    const fallbackId =
      input.fallbackModelId ?? Object.keys(models)[0] ?? "openai:gpt-5-mini";
    return {
      modelId: fallbackId,
      candidatesConsidered: 0,
      isSticky: false,
      candidateModels: [fallbackId],
    };
  }

  // Sticky routing: if previous model is in this bin and label unchanged, keep it
  if (
    input.previousModelId &&
    input.previousRouteLabel === input.routeLabel &&
    isModelEligible(input.previousModelId, input, models)
  ) {
    const allCandidates = [...bin.primary, ...bin.fallbacks];
    if (allCandidates.includes(input.previousModelId)) {
      return {
        modelId: input.previousModelId,
        candidatesConsidered: allCandidates.length,
        isSticky: true,
        candidateModels: allCandidates,
      };
    }
  }

  // Filter primary models by eligibility
  const eligiblePrimary = bin.primary.filter((id) =>
    isModelEligible(id, input, models),
  );

  if (eligiblePrimary.length > 0) {
    const sorted = sortByCostSpeedPreference(
      eligiblePrimary,
      input.preferences,
      models,
    );
    return {
      modelId: sorted[0],
      candidatesConsidered: eligiblePrimary.length,
      isSticky: false,
      candidateModels: sorted,
    };
  }

  // Try fallbacks
  const eligibleFallbacks = bin.fallbacks.filter((id) =>
    isModelEligible(id, input, models),
  );

  if (eligibleFallbacks.length > 0) {
    const sorted = sortByCostSpeedPreference(
      eligibleFallbacks,
      input.preferences,
      models,
    );
    return {
      modelId: sorted[0],
      candidatesConsidered: eligibleFallbacks.length,
      isSticky: false,
      candidateModels: sorted,
    };
  }

  // All exhausted: recurse with fallback_default (if not already there)
  if (input.routeLabel !== "fallback_default") {
    return selectFromBin({ ...input, routeLabel: "fallback_default" });
  }

  // Absolute last resort
  const fallbackId =
    input.fallbackModelId ?? Object.keys(models)[0] ?? "openai:gpt-5-mini";
  return {
    modelId: fallbackId,
    candidatesConsidered: 0,
    isSticky: false,
    candidateModels: [fallbackId],
  };
}
