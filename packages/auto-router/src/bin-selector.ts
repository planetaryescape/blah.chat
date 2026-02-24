/**
 * Bin Selector
 *
 * Given a route label + constraints, selects the best model from the bin.
 * Handles capability filtering, user preferences, sticky routing, and fallbacks.
 */

import { ROUTE_BINS } from "./bins";
import { MODEL_CONFIG, type RouterPreferences } from "./profiles";
import type { RouteLabel } from "./types";

interface BinSelectionInput {
  routeLabel: RouteLabel;
  preferences: RouterPreferences;
  previousModelId?: string;
  previousRouteLabel?: RouteLabel;
  excludedModels?: string[];
  currentContextTokens?: number;
  requiresVision?: boolean;
}

interface BinSelectionResult {
  modelId: string;
  candidatesConsidered: number;
  isSticky: boolean;
  candidateModels: string[];
}

function isModelEligible(modelId: string, input: BinSelectionInput): boolean {
  const config = MODEL_CONFIG[modelId];
  if (!config) return false;
  if (config.isInternalOnly) return false;
  if (input.excludedModels?.includes(modelId)) return false;

  // Context window check
  if (
    input.currentContextTokens &&
    config.contextWindow < input.currentContextTokens * 1.2
  ) {
    return false;
  }

  // Vision capability check
  if (input.requiresVision && !config.capabilities.includes("vision")) {
    return false;
  }

  return true;
}

function sortByCostSpeedPreference(
  modelIds: string[],
  preferences: RouterPreferences,
): string[] {
  return [...modelIds].sort((a, b) => {
    const configA = MODEL_CONFIG[a];
    const configB = MODEL_CONFIG[b];
    if (!configA || !configB) return 0;

    const avgCostA = (configA.pricing.input + configA.pricing.output) / 2;
    const avgCostB = (configB.pricing.input + configB.pricing.output) / 2;

    // costBias > 50 means prefer cheaper, speedBias > 50 means prefer faster
    const costWeight = (preferences.costBias - 50) / 50;
    const speedWeight = (preferences.speedBias - 50) / 50;

    // Lower cost is better when costBias > 50
    const costDiff = (avgCostA - avgCostB) * costWeight;

    // Models with fast host orders get speed bonus
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
  const bin = ROUTE_BINS[input.routeLabel];

  // Sticky routing: if previous model is in this bin and label unchanged, keep it
  if (
    input.previousModelId &&
    input.previousRouteLabel === input.routeLabel &&
    isModelEligible(input.previousModelId, input)
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
    isModelEligible(id, input),
  );

  if (eligiblePrimary.length > 0) {
    const sorted = sortByCostSpeedPreference(
      eligiblePrimary,
      input.preferences,
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
    isModelEligible(id, input),
  );

  if (eligibleFallbacks.length > 0) {
    const sorted = sortByCostSpeedPreference(
      eligibleFallbacks,
      input.preferences,
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
  return {
    modelId: "openai:gpt-5-mini",
    candidatesConsidered: 0,
    isSticky: false,
    candidateModels: ["openai:gpt-5-mini"],
  };
}
