import { describe, expect, it } from "vitest";
import {
  buildComparisonStats,
  buildLatestHealthMap,
  buildOutcomeStats,
  scoreCandidate,
  scoreCandidates,
  selectCandidate,
} from "./policy-engine";
import {
  type CandidateInput,
  DEFAULT_POLICY_WEIGHTS,
  type ScoringContext,
} from "./types";

function makeCandidate(
  overrides: Partial<CandidateInput> & { modelId: string },
): CandidateInput {
  return {
    binIndex: 0,
    pricing: { input: 2, output: 4 },
    ...overrides,
  };
}

function makeContext(overrides?: Partial<ScoringContext>): ScoringContext {
  return {
    routeLabel: "balanced_general",
    weights: { ...DEFAULT_POLICY_WEIGHTS },
    costBias: 50,
    speedBias: 50,
    totalCandidates: 3,
    maxAverageCost: 10,
    ...overrides,
  };
}

describe("scoreCandidate", () => {
  it("produces correct score from known inputs", () => {
    const candidate = makeCandidate({
      modelId: "openai:gpt-5",
      binIndex: 0,
      pricing: { input: 2, output: 4 },
      outcomeStats: {
        total: 10,
        complete: 8,
        error: 1,
        cancelled: 1,
        latencyTotal: 20_000,
        latencyCount: 8,
        ttftTotal: 4_000,
        ttftCount: 8,
        costTotal: 0.5,
        costCount: 8,
      },
    });
    const ctx = makeContext({ totalCandidates: 3, maxAverageCost: 10 });
    const result = scoreCandidate(candidate, ctx);

    // binRank: 0.4 * (3 - 0) = 1.2
    // successRate: (8/10) * 2 = 1.6
    // errorRate: -(1/10) * 1.5 = -0.15
    // cancelRate: -(1/10) * 0.75 = -0.075
    // latencySeconds: -(20000/8/1000) * 0.15 = -0.375
    // ttftSeconds: -(4000/8/1000) * 0.15 = -0.075
    // costScore: (1 - 3/10) * ((50-50)/50) * 1 = 0 (bias at 50)
    // speedScore: 0 * ((50-50)/50) * 0.5 = 0
    // stickyBonus: 0
    // healthPenalty: 0
    // comparisonWinRate: 0.5 * 1.0 = 0.5 (default when no stats)
    // Total: 1.2 + 1.6 - 0.15 - 0.075 - 0.375 - 0.075 + 0 + 0 + 0 - 0 + 0.5 = 2.625

    expect(result.score).toBeCloseTo(2.625, 3);
    expect(result.modelId).toBe("openai:gpt-5");
    expect(result.rank).toBe(0); // rank assigned by scoreCandidates, not scoreCandidate
  });

  it("uses 0.5 default success rate when no outcome stats", () => {
    const candidate = makeCandidate({ modelId: "openai:gpt-5" });
    const ctx = makeContext();
    const result = scoreCandidate(candidate, ctx);

    // successRate should be 0.5 (default)
    const successComponent = result.explanation.components.find(
      (c) => c.name === "successRate",
    );
    expect(successComponent?.rawValue).toBe(0.5);
  });
});

describe("scoreCandidates", () => {
  it("ranks by score descending", () => {
    const candidates = [
      makeCandidate({
        modelId: "cheap-model",
        binIndex: 2,
        pricing: { input: 0.1, output: 0.2 },
      }),
      makeCandidate({
        modelId: "mid-model",
        binIndex: 1,
        pricing: { input: 2, output: 4 },
      }),
      makeCandidate({
        modelId: "best-model",
        binIndex: 0,
        pricing: { input: 5, output: 10 },
      }),
    ];
    const ctx = makeContext({ totalCandidates: 3 });
    const ranked = scoreCandidates(candidates, ctx);

    expect(ranked[0].modelId).toBe("best-model");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);

    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
    }
  });
});

describe("sticky bonus", () => {
  it("applies when previousModelId + routeLabel match", () => {
    const candidate = makeCandidate({ modelId: "openai:gpt-5" });
    const ctxSticky = makeContext({
      previousModelId: "openai:gpt-5",
      previousRouteLabel: "balanced_general",
      routeLabel: "balanced_general",
    });
    const ctxNotSticky = makeContext({
      previousModelId: "other-model",
      previousRouteLabel: "balanced_general",
      routeLabel: "balanced_general",
    });

    const sticky = scoreCandidate(candidate, ctxSticky);
    const notSticky = scoreCandidate(candidate, ctxNotSticky);

    expect(sticky.score).toBeGreaterThan(notSticky.score);
    expect(sticky.features.isSticky).toBe(true);
    expect(sticky.features.stickyBonus).toBe(
      DEFAULT_POLICY_WEIGHTS.stickyBonus,
    );
    expect(notSticky.features.isSticky).toBe(false);
    expect(notSticky.features.stickyBonus).toBe(0);
  });

  it("does not apply when routeLabel differs", () => {
    const candidate = makeCandidate({ modelId: "openai:gpt-5" });
    const ctx = makeContext({
      previousModelId: "openai:gpt-5",
      previousRouteLabel: "code_heavy",
      routeLabel: "balanced_general",
    });

    const result = scoreCandidate(candidate, ctx);
    expect(result.features.isSticky).toBe(false);
  });
});

describe("health penalty", () => {
  it("applies degradedPenalty for degraded provider", () => {
    const healthy = makeCandidate({
      modelId: "model-a",
      health: { status: "healthy" },
    });
    const degraded = makeCandidate({
      modelId: "model-b",
      health: { status: "degraded" },
    });
    const ctx = makeContext();

    const healthyScore = scoreCandidate(healthy, ctx);
    const degradedScore = scoreCandidate(degraded, ctx);

    expect(healthyScore.score).toBeGreaterThan(degradedScore.score);
    expect(degradedScore.features.healthStatus).toBe("degraded");
  });

  it("applies downPenalty for down provider (heavier than degraded)", () => {
    const degraded = makeCandidate({
      modelId: "model-a",
      health: { status: "degraded" },
    });
    const down = makeCandidate({
      modelId: "model-b",
      health: { status: "down" },
    });
    const ctx = makeContext();

    const degradedScore = scoreCandidate(degraded, ctx);
    const downScore = scoreCandidate(down, ctx);

    expect(degradedScore.score).toBeGreaterThan(downScore.score);
  });
});

describe("comparison win rate", () => {
  it("factors into score (80% > 20% all else equal)", () => {
    const winner = makeCandidate({
      modelId: "model-winner",
      comparisonStats: { wins: 8, losses: 2, ties: 0, total: 10 },
    });
    const loser = makeCandidate({
      modelId: "model-loser",
      comparisonStats: { wins: 2, losses: 8, ties: 0, total: 10 },
    });
    const ctx = makeContext();

    const winnerScore = scoreCandidate(winner, ctx);
    const loserScore = scoreCandidate(loser, ctx);

    expect(winnerScore.score).toBeGreaterThan(loserScore.score);
    expect(winnerScore.features.comparisonWinRate).toBeCloseTo(0.8);
    expect(loserScore.features.comparisonWinRate).toBeCloseTo(0.2);
  });
});

describe("cost/speed bias", () => {
  it("at 50 contributes zero", () => {
    const candidate = makeCandidate({
      modelId: "openai:gpt-5",
      pricing: { input: 10, output: 20 },
    });
    const ctx = makeContext({ costBias: 50, speedBias: 50 });
    const result = scoreCandidate(candidate, ctx);

    const costComponent = result.explanation.components.find(
      (c) => c.name === "costScore",
    );
    const speedComponent = result.explanation.components.find(
      (c) => c.name === "speedScore",
    );

    expect(costComponent?.contribution).toBeCloseTo(0);
    expect(speedComponent?.contribution).toBeCloseTo(0);
  });

  it("high costBias penalizes expensive models", () => {
    const expensive = makeCandidate({
      modelId: "expensive",
      pricing: { input: 15, output: 15 },
    });
    const ctx = makeContext({ costBias: 90, maxAverageCost: 15 });
    const result = scoreCandidate(expensive, ctx);

    const costComponent = result.explanation.components.find(
      (c) => c.name === "costScore",
    );
    // costScore = (1 - 15/15) = 0, so contribution = 0 * 0.8 * 1 = 0
    // But a cheaper model would get positive contribution
    expect(costComponent?.contribution).toBe(0);

    const cheap = makeCandidate({
      modelId: "cheap",
      pricing: { input: 1, output: 1 },
    });
    const cheapResult = scoreCandidate(cheap, ctx);
    const cheapCostComponent = cheapResult.explanation.components.find(
      (c) => c.name === "costScore",
    );
    expect(cheapCostComponent!.contribution).toBeGreaterThan(0);
  });
});

describe("explanation", () => {
  it("includes all score components with correct values", () => {
    const candidate = makeCandidate({
      modelId: "openai:gpt-5",
      outcomeStats: {
        total: 4,
        complete: 3,
        error: 1,
        cancelled: 0,
        latencyTotal: 8_000,
        latencyCount: 3,
        ttftTotal: 1_500,
        ttftCount: 3,
        costTotal: 0.1,
        costCount: 3,
      },
      health: { status: "healthy" },
      comparisonStats: { wins: 3, losses: 1, ties: 0, total: 4 },
    });
    const ctx = makeContext();
    const result = scoreCandidate(candidate, ctx);

    const componentNames = result.explanation.components.map((c) => c.name);
    expect(componentNames).toContain("binRank");
    expect(componentNames).toContain("successRate");
    expect(componentNames).toContain("errorRate");
    expect(componentNames).toContain("cancelRate");
    expect(componentNames).toContain("latencySeconds");
    expect(componentNames).toContain("ttftSeconds");
    expect(componentNames).toContain("costScore");
    expect(componentNames).toContain("speedScore");
    expect(componentNames).toContain("stickyBonus");
    expect(componentNames).toContain("healthPenalty");
    expect(componentNames).toContain("comparisonWinRate");

    const sum = result.explanation.components.reduce(
      (acc, c) => acc + c.contribution,
      0,
    );
    expect(result.explanation.totalScore).toBeCloseTo(sum, 6);
    expect(result.score).toBeCloseTo(result.explanation.totalScore, 6);
  });
});

describe("pure function", () => {
  it("same inputs always produce same outputs", () => {
    const candidate = makeCandidate({
      modelId: "openai:gpt-5",
      outcomeStats: {
        total: 5,
        complete: 4,
        error: 1,
        cancelled: 0,
        latencyTotal: 10_000,
        latencyCount: 4,
        ttftTotal: 2_000,
        ttftCount: 4,
        costTotal: 0.2,
        costCount: 4,
      },
    });
    const ctx = makeContext();
    const a = scoreCandidate(candidate, ctx);
    const b = scoreCandidate(candidate, ctx);
    expect(a).toStrictEqual(b);
  });
});

describe("selectCandidate", () => {
  it("returns fallback when candidates empty", () => {
    const ctx = makeContext();
    const result = selectCandidate([], ctx, {
      fallbackModelId: "openai:gpt-5-mini",
    });

    expect(result.selectedModelId).toBe("openai:gpt-5-mini");
    expect(result.rankedCandidates).toHaveLength(0);
    expect(result.isExploration).toBe(false);
  });

  it("selects top candidate when not exploring", () => {
    const candidates = [
      makeCandidate({ modelId: "best", binIndex: 0 }),
      makeCandidate({ modelId: "worst", binIndex: 2 }),
    ];
    const ctx = makeContext({
      totalCandidates: 2,
      weights: { ...DEFAULT_POLICY_WEIGHTS, explorationRate: 0 },
    });
    const result = selectCandidate(candidates, ctx, { random: () => 0.99 });
    expect(result.selectedModelId).toBe("best");
    expect(result.isExploration).toBe(false);
  });
});

describe("buildOutcomeStats", () => {
  it("groups rows by model and aggregates correctly", () => {
    const rows = [
      {
        selectedModelId: "a",
        status: "complete",
        latencyMs: 1000,
        ttftMs: 200,
        costUsd: 0.01,
      },
      {
        selectedModelId: "a",
        status: "error",
        latencyMs: null,
        ttftMs: null,
        costUsd: null,
      },
      {
        selectedModelId: "b",
        status: "complete",
        latencyMs: 500,
        ttftMs: 100,
        costUsd: 0.005,
      },
    ];
    const stats = buildOutcomeStats(rows);

    const a = stats.get("a");
    expect(a).toBeDefined();
    expect(a!.total).toBe(2);
    expect(a!.complete).toBe(1);
    expect(a!.error).toBe(1);
    expect(a!.latencyTotal).toBe(1000);
    expect(a!.latencyCount).toBe(1);

    const b = stats.get("b");
    expect(b!.total).toBe(1);
    expect(b!.complete).toBe(1);
  });
});

describe("buildComparisonStats", () => {
  it("groups feedback rows into per-model stats", () => {
    const rows = [
      { modelId: "a", signal: "win" },
      { modelId: "a", signal: "win" },
      { modelId: "a", signal: "loss" },
      { modelId: "b", signal: "loss" },
      { modelId: "b", signal: "tie" },
    ];
    const stats = buildComparisonStats(rows);

    expect(stats.get("a")).toEqual({ wins: 2, losses: 1, ties: 0, total: 3 });
    expect(stats.get("b")).toEqual({ wins: 0, losses: 1, ties: 1, total: 2 });
  });

  it("counts regenerated signals as losses", () => {
    const rows = [
      { modelId: "a", signal: "win" },
      { modelId: "a", signal: "regenerated" },
      { modelId: "a", signal: "regenerated" },
      { modelId: "b", signal: "regenerated" },
    ];
    const stats = buildComparisonStats(rows);

    expect(stats.get("a")).toEqual({ wins: 1, losses: 2, ties: 0, total: 3 });
    expect(stats.get("b")).toEqual({ wins: 0, losses: 1, ties: 0, total: 1 });
  });

  it("counts model_switch signals as losses", () => {
    const rows = [
      { modelId: "a", signal: "win" },
      { modelId: "a", signal: "model_switch" },
      { modelId: "b", signal: "model_switch" },
      { modelId: "b", signal: "model_switch" },
    ];
    const stats = buildComparisonStats(rows);

    expect(stats.get("a")).toEqual({ wins: 1, losses: 1, ties: 0, total: 2 });
    expect(stats.get("b")).toEqual({ wins: 0, losses: 2, ties: 0, total: 2 });
  });

  it("counts both_bad signals as losses for all participants", () => {
    const rows = [
      { modelId: "a", signal: "both_bad" },
      { modelId: "b", signal: "both_bad" },
      { modelId: "a", signal: "win" },
    ];
    const stats = buildComparisonStats(rows);

    expect(stats.get("a")).toEqual({ wins: 1, losses: 1, ties: 0, total: 2 });
    expect(stats.get("b")).toEqual({ wins: 0, losses: 1, ties: 0, total: 1 });
  });
});

describe("buildLatestHealthMap", () => {
  it("maps provider health to candidate model IDs", () => {
    const rows = [
      { provider: "openai", modelId: "openai:gpt-5", status: "degraded" },
      {
        provider: "anthropic",
        modelId: "anthropic:claude-sonnet",
        status: "healthy",
      },
      { provider: "openai", modelId: null, status: "down" },
    ];
    const map = buildLatestHealthMap(rows, [
      "openai:gpt-5",
      "anthropic:claude-sonnet",
      "openai:gpt-5-mini",
    ]);

    expect(map.get("openai:gpt-5")?.status).toBe("degraded");
    expect(map.get("anthropic:claude-sonnet")?.status).toBe("healthy");
    // openai:gpt-5-mini has no model-specific row but provider-level "down"
    expect(map.get("openai:gpt-5-mini")?.status).toBe("down");
  });
});
