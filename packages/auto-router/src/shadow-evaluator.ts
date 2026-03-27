/**
 * Shadow Routing Evaluator
 *
 * Compares shadow picks against actual outcomes to determine
 * whether the shadow model would have performed better.
 * Pure functions — no DB access.
 */

export interface ShadowDecisionInput {
  decisionId: string;
  selectedModelId: string;
  shadowModelId: string;
  outcomeStatus: string;
  outcomeLatencyMs: number | null;
  outcomeCostUsd: number | null;
}

export interface ModelHistoricalStats {
  avgLatencyMs: number;
  avgCostUsd: number;
  successRate: number;
}

export interface ShadowEvaluation {
  decisionId: string;
  selectedModelId: string;
  shadowModelId: string;
  shadowWouldWin: boolean;
}

export interface ShadowModelSummary {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

/**
 * Evaluate shadow decisions by comparing actual outcome against
 * shadow model's historical performance.
 *
 * Shadow "wins" when it has better success rate AND lower or equal cost.
 */
export function evaluateShadowDecisions(
  decisions: ShadowDecisionInput[],
  historicalStats: Map<string, ModelHistoricalStats>,
): ShadowEvaluation[] {
  const results: ShadowEvaluation[] = [];

  for (const decision of decisions) {
    if (decision.outcomeStatus !== "complete") continue;

    const shadowStats = historicalStats.get(decision.shadowModelId);
    const actualStats = historicalStats.get(decision.selectedModelId);
    if (!shadowStats || !actualStats) continue;

    const shadowBetterLatency =
      shadowStats.avgLatencyMs <= actualStats.avgLatencyMs;
    const shadowBetterCost = shadowStats.avgCostUsd <= actualStats.avgCostUsd;
    const shadowBetterSuccess =
      shadowStats.successRate >= actualStats.successRate;

    const shadowWouldWin =
      shadowBetterSuccess && (shadowBetterLatency || shadowBetterCost);

    results.push({
      decisionId: decision.decisionId,
      selectedModelId: decision.selectedModelId,
      shadowModelId: decision.shadowModelId,
      shadowWouldWin,
    });
  }

  return results;
}

/**
 * Summarize shadow performance per shadow model.
 */
export function summarizeShadowPerformance(
  evaluations: ShadowEvaluation[],
): Map<string, ShadowModelSummary> {
  const grouped = new Map<string, ShadowModelSummary>();

  for (const evaluation of evaluations) {
    const current = grouped.get(evaluation.shadowModelId) ?? {
      wins: 0,
      losses: 0,
      total: 0,
      winRate: 0,
    };
    current.total += 1;
    if (evaluation.shadowWouldWin) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }
    current.winRate = current.total > 0 ? current.wins / current.total : 0;
    grouped.set(evaluation.shadowModelId, current);
  }

  return grouped;
}

/**
 * Adjust exploration rate based on shadow evaluation results.
 *
 * When shadow picks outperform (win rate > threshold), increase exploration.
 * When shadow picks underperform, decrease it.
 */
export function adjustExplorationRate(
  currentRate: number,
  shadowWinRate: number,
  config: { threshold: number; step: number; min: number; max: number },
): number {
  if (shadowWinRate > config.threshold) {
    return Math.min(currentRate + config.step, config.max);
  }
  if (shadowWinRate < config.threshold) {
    return Math.max(currentRate - config.step, config.min);
  }
  return currentRate;
}
