import { describe, expect, it } from "vitest";
import { explore } from "./exploration";
import type { ScoredCandidate } from "./types";

function makeScoredCandidate(
  overrides: Partial<ScoredCandidate> & { modelId: string },
): ScoredCandidate {
  return {
    provider: overrides.modelId.split(":")[0] ?? overrides.modelId,
    score: 10,
    rank: 1,
    features: {
      routeLabel: "balanced_general",
      binIndex: 0,
      successRate: 0.9,
      errorRate: 0.05,
      cancelRate: 0.05,
      avgLatencySeconds: 2,
      avgTtftSeconds: 0.5,
      costScore: 0.5,
      speedScore: 0,
      isSticky: false,
      stickyBonus: 0,
      healthStatus: "healthy",
      comparisonWinRate: 0.5,
    },
    explanation: {
      components: [],
      totalScore: 10,
    },
    ...overrides,
  };
}

describe("explore", () => {
  const top = makeScoredCandidate({
    modelId: "top-model",
    score: 10,
    rank: 1,
  });
  const second = makeScoredCandidate({
    modelId: "second-model",
    score: 8,
    rank: 2,
  });
  const third = makeScoredCandidate({
    modelId: "third-model",
    score: 6,
    rank: 3,
  });
  const candidates = [top, second, third];

  it("picks non-top candidate when random < explorationRate", () => {
    const result = explore(candidates, {
      explorationRate: 0.1,
      random: () => 0.05, // < 0.1 → explore
    });

    expect(result.isExploration).toBe(true);
    expect(result.selectedIndex).toBeGreaterThan(0);
  });

  it("picks top candidate when random >= explorationRate", () => {
    const result = explore(candidates, {
      explorationRate: 0.1,
      random: () => 0.5, // >= 0.1 → no explore
    });

    expect(result.isExploration).toBe(false);
    expect(result.selectedIndex).toBe(0);
  });

  it("always returns single candidate", () => {
    const result = explore([top], {
      explorationRate: 1.0, // max exploration
      random: () => 0.001,
    });

    expect(result.selectedIndex).toBe(0);
    expect(result.isExploration).toBe(false);
  });

  it("never picks degraded/down models during exploration", () => {
    const degraded = makeScoredCandidate({
      modelId: "degraded-model",
      score: 8,
      rank: 2,
      features: {
        ...second.features,
        healthStatus: "degraded",
      },
    });
    const down = makeScoredCandidate({
      modelId: "down-model",
      score: 6,
      rank: 3,
      features: {
        ...third.features,
        healthStatus: "down",
      },
    });

    // All non-top candidates are unhealthy, so exploration should fall back to top
    for (let i = 0; i < 20; i++) {
      const result = explore([top, degraded, down], {
        explorationRate: 1.0,
        random: () => 0.001,
        excludeStatuses: ["down", "degraded"],
      });
      expect(result.selectedIndex).toBe(0);
      expect(result.isExploration).toBe(false);
    }
  });

  it("explorationRate = 0 is always deterministic", () => {
    for (let i = 0; i < 20; i++) {
      const result = explore(candidates, {
        explorationRate: 0,
        random: () => 0.001,
      });
      expect(result.selectedIndex).toBe(0);
      expect(result.isExploration).toBe(false);
    }
  });

  it("shadow mode returns top pick but records shadow pick", () => {
    const result = explore(candidates, {
      explorationRate: 0.1,
      random: () => 0.5, // no explore for primary
      shadow: true,
    });

    expect(result.selectedIndex).toBe(0);
    expect(result.isExploration).toBe(false);
    expect(result.shadowIndex).toBeDefined();
    // Shadow should pick a non-top candidate
    expect(result.shadowIndex).toBeGreaterThan(0);
  });

  it("seeded random produces reproducible results", () => {
    const randomValues = [0.02, 0.7, 0.3];
    let idx = 0;
    const seeded = () => randomValues[idx++ % randomValues.length];

    const a = explore(candidates, {
      explorationRate: 0.1,
      random: seeded,
    });

    idx = 0;
    const b = explore(candidates, {
      explorationRate: 0.1,
      random: seeded,
    });

    expect(a.selectedIndex).toBe(b.selectedIndex);
    expect(a.isExploration).toBe(b.isExploration);
  });
});
