/**
 * Policy Engine
 *
 * Outcome-driven candidate scoring extracted from generation service.
 * Pure functions: no DB, no side effects, fully testable.
 */

import { explore } from "./exploration";
import type {
  CandidateFeatures,
  CandidateInput,
  ComparisonStats,
  OutcomeStats,
  PolicyEngineResult,
  ProviderHealth,
  ScoreComponent,
  ScoredCandidate,
  ScoreExplanation,
  ScoringContext,
} from "./types";

function providerFromModelId(modelId: string): string {
  return modelId.split(":")[0] ?? modelId;
}

function computeSpeedScore(candidate: CandidateInput): number {
  if (
    candidate.hostOrder?.some((host) => host === "groq" || host === "cerebras")
  ) {
    return 1;
  }
  return 0;
}

export function scoreCandidate(
  candidate: CandidateInput,
  context: ScoringContext,
): ScoredCandidate {
  const { weights: w } = context;
  const stats = candidate.outcomeStats;
  const health = candidate.health;
  const comparison = candidate.comparisonStats;

  const successRate =
    stats && stats.total > 0 ? stats.complete / stats.total : 0.5;
  const errorRate = stats && stats.total > 0 ? stats.error / stats.total : 0;
  const cancelRate =
    stats && stats.total > 0 ? stats.cancelled / stats.total : 0;
  const avgLatencySeconds =
    stats && stats.latencyCount > 0
      ? stats.latencyTotal / stats.latencyCount / 1_000
      : 0;
  const avgTtftSeconds =
    stats && stats.ttftCount > 0
      ? stats.ttftTotal / stats.ttftCount / 1_000
      : 0;

  const avgCost = (candidate.pricing.input + candidate.pricing.output) / 2;
  const costScore =
    context.maxAverageCost > 0 ? 1 - avgCost / context.maxAverageCost : 0;
  const speedScore = computeSpeedScore(candidate);

  const isSticky =
    context.previousModelId === candidate.modelId &&
    context.previousRouteLabel === context.routeLabel;
  const stickyBonus = isSticky ? w.stickyBonus : 0;

  const healthPenalty =
    health?.status === "down"
      ? w.downPenalty
      : health?.status === "degraded"
        ? w.degradedPenalty
        : 0;

  const comparisonWinRate =
    comparison && comparison.total > 0
      ? comparison.wins / comparison.total
      : 0.5;

  const costBiasFactor = (context.costBias - 50) / 50;
  const speedBiasFactor = (context.speedBias - 50) / 50;

  const components: ScoreComponent[] = [
    {
      name: "binRank",
      rawValue: context.totalCandidates - candidate.binIndex,
      weight: w.binRank,
      contribution: (context.totalCandidates - candidate.binIndex) * w.binRank,
    },
    {
      name: "successRate",
      rawValue: successRate,
      weight: w.successRate,
      contribution: successRate * w.successRate,
    },
    {
      name: "errorRate",
      rawValue: errorRate,
      weight: w.errorRate,
      contribution: -(errorRate * w.errorRate),
    },
    {
      name: "cancelRate",
      rawValue: cancelRate,
      weight: w.cancelRate,
      contribution: -(cancelRate * w.cancelRate),
    },
    {
      name: "latencySeconds",
      rawValue: avgLatencySeconds,
      weight: w.latencySeconds,
      contribution: -(avgLatencySeconds * w.latencySeconds),
    },
    {
      name: "ttftSeconds",
      rawValue: avgTtftSeconds,
      weight: w.ttftSeconds,
      contribution: -(avgTtftSeconds * w.ttftSeconds),
    },
    {
      name: "costScore",
      rawValue: costScore,
      weight: w.costScore,
      contribution: costScore * costBiasFactor * w.costScore,
    },
    {
      name: "speedScore",
      rawValue: speedScore,
      weight: w.speedScore,
      contribution: speedScore * speedBiasFactor * w.speedScore,
    },
    {
      name: "stickyBonus",
      rawValue: isSticky ? 1 : 0,
      weight: w.stickyBonus,
      contribution: stickyBonus,
    },
    {
      name: "healthPenalty",
      rawValue: healthPenalty > 0 ? 1 : 0,
      weight: healthPenalty,
      contribution: -healthPenalty,
    },
    {
      name: "comparisonWinRate",
      rawValue: comparisonWinRate,
      weight: w.comparisonWinRate,
      contribution: comparisonWinRate * w.comparisonWinRate,
    },
  ];

  const totalScore = components.reduce((acc, c) => acc + c.contribution, 0);

  const features: CandidateFeatures = {
    routeLabel: context.routeLabel,
    binIndex: candidate.binIndex,
    successRate,
    errorRate,
    cancelRate,
    avgLatencySeconds,
    avgTtftSeconds,
    costScore,
    speedScore,
    isSticky,
    stickyBonus,
    healthStatus: health?.status ?? "unknown",
    comparisonWinRate,
  };

  const explanation: ScoreExplanation = {
    components,
    totalScore,
  };

  return {
    modelId: candidate.modelId,
    provider: providerFromModelId(candidate.modelId),
    score: totalScore,
    rank: 0,
    features,
    explanation,
  };
}

export function scoreCandidates(
  candidates: CandidateInput[],
  context: ScoringContext,
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, context))
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

export function selectCandidate(
  candidates: CandidateInput[],
  context: ScoringContext,
  options?: {
    random?: () => number;
    fallbackModelId?: string;
    shadow?: boolean;
    isComparisonMode?: boolean;
  },
): PolicyEngineResult {
  if (candidates.length === 0) {
    return {
      rankedCandidates: [],
      selectedModelId: options?.fallbackModelId ?? "openai:gpt-5-mini",
      isExploration: false,
      explanation: "No candidates available; using fallback.",
    };
  }

  const ranked = scoreCandidates(candidates, context);
  const explorationRate = context.weights.explorationRate;

  // Skip exploration in comparison mode (already exploring by design)
  if (options?.isComparisonMode || explorationRate <= 0) {
    return {
      rankedCandidates: ranked,
      selectedModelId: ranked[0].modelId,
      isExploration: false,
      explanation: `Top candidate: ${ranked[0].modelId} (score ${ranked[0].score.toFixed(3)})`,
    };
  }

  const explorationResult = explore(ranked, {
    explorationRate,
    random: options?.random,
    shadow: options?.shadow,
    excludeStatuses: ["down", "degraded"],
  });

  const selected = ranked[explorationResult.selectedIndex];
  const shadowPick =
    explorationResult.shadowIndex !== undefined
      ? ranked[explorationResult.shadowIndex]
      : undefined;

  return {
    rankedCandidates: ranked,
    selectedModelId: selected.modelId,
    isExploration: explorationResult.isExploration,
    shadowModelId: shadowPick?.modelId,
    explanation: explorationResult.isExploration
      ? `Exploration pick: ${selected.modelId} (score ${selected.score.toFixed(3)}); top was ${ranked[0].modelId}`
      : shadowPick
        ? `Top candidate: ${selected.modelId} (score ${selected.score.toFixed(3)}); shadow would pick ${shadowPick.modelId}`
        : `Top candidate: ${selected.modelId} (score ${selected.score.toFixed(3)})`,
  };
}

// ---------------------------------------------------------------------------
// Data helpers (extracted from generation-v2/service.ts)
// ---------------------------------------------------------------------------

export function buildOutcomeStats(
  rows: Array<{
    selectedModelId: string;
    status: string;
    latencyMs: number | null;
    ttftMs: number | null;
    costUsd: number | null;
  }>,
): Map<string, OutcomeStats> {
  const grouped = new Map<string, OutcomeStats>();

  for (const row of rows) {
    const current = grouped.get(row.selectedModelId) ?? {
      total: 0,
      complete: 0,
      error: 0,
      cancelled: 0,
      latencyTotal: 0,
      latencyCount: 0,
      ttftTotal: 0,
      ttftCount: 0,
      costTotal: 0,
      costCount: 0,
    };
    current.total += 1;
    if (row.status === "complete") current.complete += 1;
    if (row.status === "error") current.error += 1;
    if (row.status === "cancelled") current.cancelled += 1;
    if (typeof row.latencyMs === "number") {
      current.latencyTotal += row.latencyMs;
      current.latencyCount += 1;
    }
    if (typeof row.ttftMs === "number") {
      current.ttftTotal += row.ttftMs;
      current.ttftCount += 1;
    }
    if (typeof row.costUsd === "number") {
      current.costTotal += row.costUsd;
      current.costCount += 1;
    }
    grouped.set(row.selectedModelId, current);
  }

  return grouped;
}

export function buildComparisonStats(
  rows: Array<{ modelId: string; signal: string }>,
): Map<string, ComparisonStats> {
  const grouped = new Map<string, ComparisonStats>();

  for (const row of rows) {
    const current = grouped.get(row.modelId) ?? {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };
    current.total += 1;
    if (row.signal === "win") current.wins += 1;
    else if (
      row.signal === "loss" ||
      row.signal === "regenerated" ||
      row.signal === "model_switch" ||
      row.signal === "both_bad"
    )
      current.losses += 1;
    else if (row.signal === "tie") current.ties += 1;
    grouped.set(row.modelId, current);
  }

  return grouped;
}

export function buildLatestHealthMap(
  rows: Array<{
    provider: string;
    modelId: string | null;
    status: string;
  }>,
  candidateModelIds: string[],
): Map<string, ProviderHealth> {
  const latest = new Map<string, ProviderHealth>();

  for (const modelId of candidateModelIds) {
    const provider = providerFromModelId(modelId);
    const exact = rows.find((row) => row.modelId === modelId);
    const providerLevel = rows.find(
      (row) => row.modelId === null && row.provider === provider,
    );
    const match = exact ?? providerLevel;
    if (match) {
      latest.set(modelId, {
        status: match.status as ProviderHealth["status"],
      });
    }
  }

  return latest;
}
