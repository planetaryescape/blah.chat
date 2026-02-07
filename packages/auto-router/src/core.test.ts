import { describe, expect, it } from "vitest";
import { scoreModels, selectWithExploration } from "./core";
import type { TaskClassification } from "./profiles";

const baseClassification: TaskClassification = {
  primaryCategory: "reasoning",
  complexity: "moderate",
  requiresVision: false,
  requiresLongContext: false,
  requiresReasoning: true,
  confidence: 0.9,
  isHighStakes: false,
  recommendedAction: "change",
};

describe("selectWithExploration", () => {
  it("is deterministic with fixed random source", () => {
    const scored = scoreModels(
      ["openai:gpt-5-mini", "openai:gpt-5", "google:gemini-2.5-flash"],
      baseClassification,
      { costBias: 50, speedBias: 50 },
    );

    const randomValues = [0.1, 0.4, 0.7, 0.2];
    let idx = 0;
    const random = () => randomValues[idx++ % randomValues.length];

    const a = selectWithExploration(scored, baseClassification, random);
    idx = 0;
    const b = selectWithExploration(scored, baseClassification, random);

    expect(a.modelId).toBe(b.modelId);
    expect(a.explorationPick).toBe(b.explorationPick);
  });

  it("forces premium tier for high-stakes inputs when available", () => {
    const scored = scoreModels(
      ["openai:gpt-5-mini", "openai:gpt-5", "google:gemini-2.5-flash"],
      { ...baseClassification, isHighStakes: true },
      { costBias: 90, speedBias: 90 },
    );

    const pick = selectWithExploration(
      scored,
      { ...baseClassification, isHighStakes: true },
      () => 0.5,
    );

    expect(pick.modelId).toBe("openai:gpt-5");
    expect(pick.explorationPick).toBe(false);
  });
});
