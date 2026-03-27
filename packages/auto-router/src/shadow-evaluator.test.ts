import { describe, expect, it } from "vitest";
import {
  adjustExplorationRate,
  evaluateShadowDecisions,
  summarizeShadowPerformance,
} from "./shadow-evaluator";

describe("evaluateShadowDecisions", () => {
  it("compares shadow vs actual for completed decisions", () => {
    const decisions = [
      {
        decisionId: "d1",
        selectedModelId: "model-a",
        shadowModelId: "model-b",
        outcomeStatus: "complete",
        outcomeLatencyMs: 2000,
        outcomeCostUsd: 0.05,
      },
      {
        decisionId: "d2",
        selectedModelId: "model-a",
        shadowModelId: "model-c",
        outcomeStatus: "complete",
        outcomeLatencyMs: 1500,
        outcomeCostUsd: 0.04,
      },
    ];

    const historicalStats = new Map([
      ["model-a", { avgLatencyMs: 2000, avgCostUsd: 0.05, successRate: 0.9 }],
      ["model-b", { avgLatencyMs: 1000, avgCostUsd: 0.02, successRate: 0.95 }],
      ["model-c", { avgLatencyMs: 3000, avgCostUsd: 0.08, successRate: 0.7 }],
    ]);

    const results = evaluateShadowDecisions(decisions, historicalStats);

    expect(results).toHaveLength(2);
    // model-b is faster and cheaper than model-a: shadow wins
    expect(results[0].shadowWouldWin).toBe(true);
    // model-c is slower and more expensive: shadow loses
    expect(results[1].shadowWouldWin).toBe(false);
  });

  it("skips decisions without completed outcomes", () => {
    const decisions = [
      {
        decisionId: "d1",
        selectedModelId: "model-a",
        shadowModelId: "model-b",
        outcomeStatus: "error",
        outcomeLatencyMs: null,
        outcomeCostUsd: null,
      },
    ];
    const historicalStats = new Map([
      ["model-a", { avgLatencyMs: 2000, avgCostUsd: 0.05, successRate: 0.9 }],
      ["model-b", { avgLatencyMs: 1000, avgCostUsd: 0.02, successRate: 0.95 }],
    ]);

    const results = evaluateShadowDecisions(decisions, historicalStats);
    expect(results).toHaveLength(0);
  });

  it("skips decisions where shadow model has no historical stats", () => {
    const decisions = [
      {
        decisionId: "d1",
        selectedModelId: "model-a",
        shadowModelId: "model-unknown",
        outcomeStatus: "complete",
        outcomeLatencyMs: 2000,
        outcomeCostUsd: 0.05,
      },
    ];
    const historicalStats = new Map([
      ["model-a", { avgLatencyMs: 2000, avgCostUsd: 0.05, successRate: 0.9 }],
    ]);

    const results = evaluateShadowDecisions(decisions, historicalStats);
    expect(results).toHaveLength(0);
  });
});

describe("summarizeShadowPerformance", () => {
  it("produces per-model win-rate summary", () => {
    const evaluations = [
      {
        decisionId: "d1",
        selectedModelId: "model-a",
        shadowModelId: "model-b",
        shadowWouldWin: true,
      },
      {
        decisionId: "d2",
        selectedModelId: "model-a",
        shadowModelId: "model-b",
        shadowWouldWin: true,
      },
      {
        decisionId: "d3",
        selectedModelId: "model-a",
        shadowModelId: "model-b",
        shadowWouldWin: false,
      },
      {
        decisionId: "d4",
        selectedModelId: "model-a",
        shadowModelId: "model-c",
        shadowWouldWin: true,
      },
    ];

    const summary = summarizeShadowPerformance(evaluations);

    expect(summary.get("model-b")).toEqual({
      wins: 2,
      losses: 1,
      total: 3,
      winRate: 2 / 3,
    });
    expect(summary.get("model-c")).toEqual({
      wins: 1,
      losses: 0,
      total: 1,
      winRate: 1,
    });
  });

  it("returns empty map for empty evaluations", () => {
    const summary = summarizeShadowPerformance([]);
    expect(summary.size).toBe(0);
  });
});

describe("adjustExplorationRate", () => {
  it("increases rate when shadow win rate above threshold", () => {
    const result = adjustExplorationRate(0.05, 0.65, {
      threshold: 0.5,
      step: 0.02,
      min: 0.01,
      max: 0.2,
    });
    expect(result).toBe(0.07);
  });

  it("decreases rate when shadow win rate below threshold", () => {
    const result = adjustExplorationRate(0.1, 0.3, {
      threshold: 0.5,
      step: 0.02,
      min: 0.01,
      max: 0.2,
    });
    expect(result).toBe(0.08);
  });

  it("clamps to max", () => {
    const result = adjustExplorationRate(0.19, 0.8, {
      threshold: 0.5,
      step: 0.05,
      min: 0.01,
      max: 0.2,
    });
    expect(result).toBe(0.2);
  });

  it("clamps to min", () => {
    const result = adjustExplorationRate(0.02, 0.1, {
      threshold: 0.5,
      step: 0.05,
      min: 0.01,
      max: 0.2,
    });
    expect(result).toBe(0.01);
  });

  it("does not change when exactly at threshold", () => {
    const result = adjustExplorationRate(0.1, 0.5, {
      threshold: 0.5,
      step: 0.02,
      min: 0.01,
      max: 0.2,
    });
    expect(result).toBe(0.1);
  });
});
