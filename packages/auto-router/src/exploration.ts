/**
 * Exploration Policy
 *
 * Epsilon-greedy exploration for routing decisions.
 * Picks a non-top candidate at a low configurable rate to gather signal.
 * Never explores outside health constraints.
 */

import type { ScoredCandidate } from "./types";

export interface ExplorationOptions {
  explorationRate: number;
  random?: () => number;
  shadow?: boolean;
  excludeStatuses?: string[];
}

export interface ExplorationResult {
  selectedIndex: number;
  isExploration: boolean;
  shadowIndex?: number;
}

function getEligibleExplorationIndices(
  candidates: ScoredCandidate[],
  excludeStatuses?: string[],
): number[] {
  const eligible: number[] = [];
  for (let i = 1; i < candidates.length; i++) {
    const status = candidates[i].features.healthStatus;
    if (excludeStatuses?.includes(status)) {
      continue;
    }
    eligible.push(i);
  }
  return eligible;
}

function pickExplorationIndex(
  eligibleIndices: number[],
  random: () => number,
): number | undefined {
  if (eligibleIndices.length === 0) return undefined;
  return eligibleIndices[Math.floor(random() * eligibleIndices.length)];
}

export function explore(
  rankedCandidates: ScoredCandidate[],
  options: ExplorationOptions,
): ExplorationResult {
  const random = options.random ?? Math.random;

  if (rankedCandidates.length <= 1 || options.explorationRate <= 0) {
    const shadowIndex = options.shadow
      ? computeShadowIndex(rankedCandidates, options.excludeStatuses, random)
      : undefined;

    return {
      selectedIndex: 0,
      isExploration: false,
      shadowIndex,
    };
  }

  const eligible = getEligibleExplorationIndices(
    rankedCandidates,
    options.excludeStatuses,
  );

  if (options.shadow) {
    const shadowIndex = pickExplorationIndex(eligible, random);
    const roll = random();
    if (roll < options.explorationRate && eligible.length > 0) {
      const explorationIndex = pickExplorationIndex(eligible, random);
      if (explorationIndex !== undefined) {
        return {
          selectedIndex: explorationIndex,
          isExploration: true,
          shadowIndex,
        };
      }
    }
    return {
      selectedIndex: 0,
      isExploration: false,
      shadowIndex,
    };
  }

  const roll = random();
  if (roll < options.explorationRate && eligible.length > 0) {
    const explorationIndex = pickExplorationIndex(eligible, random);
    if (explorationIndex !== undefined) {
      return {
        selectedIndex: explorationIndex,
        isExploration: true,
      };
    }
  }

  return {
    selectedIndex: 0,
    isExploration: false,
  };
}

function computeShadowIndex(
  candidates: ScoredCandidate[],
  excludeStatuses: string[] | undefined,
  random: () => number,
): number | undefined {
  if (candidates.length <= 1) return undefined;
  const eligible = getEligibleExplorationIndices(candidates, excludeStatuses);
  return pickExplorationIndex(eligible, random);
}
