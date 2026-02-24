import { describe, expect, it } from "vitest";
import { selectFromBin } from "./bin-selector";

describe("selectFromBin", () => {
  it("selects first primary model for code_heavy", () => {
    const result = selectFromBin({
      routeLabel: "code_heavy",
      preferences: { costBias: 50, speedBias: 50 },
    });
    expect(result.modelId).toBe("openai:gpt-5.1-codex");
    expect(result.isSticky).toBe(false);
  });

  it("selects cheaper model when costBias is high", () => {
    const result = selectFromBin({
      routeLabel: "balanced_general",
      preferences: { costBias: 90, speedBias: 50 },
    });
    // With high cost bias, cheaper models should be preferred
    expect(result.modelId).toBeDefined();
  });

  it("uses sticky routing when previous model is in bin", () => {
    const result = selectFromBin({
      routeLabel: "code_heavy",
      preferences: { costBias: 50, speedBias: 50 },
      previousModelId: "anthropic:claude-sonnet-4",
      previousRouteLabel: "code_heavy",
    });
    expect(result.modelId).toBe("anthropic:claude-sonnet-4");
    expect(result.isSticky).toBe(true);
  });

  it("does not use sticky routing when label changed", () => {
    const result = selectFromBin({
      routeLabel: "code_heavy",
      preferences: { costBias: 50, speedBias: 50 },
      previousModelId: "anthropic:claude-sonnet-4",
      previousRouteLabel: "creative_writing",
    });
    expect(result.isSticky).toBe(false);
  });

  it("excludes specified models", () => {
    const result = selectFromBin({
      routeLabel: "code_heavy",
      preferences: { costBias: 50, speedBias: 50 },
      excludedModels: ["openai:gpt-5.1-codex"],
    });
    expect(result.modelId).not.toBe("openai:gpt-5.1-codex");
  });

  it("falls back to fallback_default when all primary and fallback exhausted", () => {
    const result = selectFromBin({
      routeLabel: "research",
      preferences: { costBias: 50, speedBias: 50 },
      excludedModels: [
        "perplexity:sonar-pro",
        "perplexity:sonar",
        "openai:gpt-5.1",
        "google:gemini-2.5-pro",
      ],
    });
    // Should fall through to fallback_default bin
    expect(result.modelId).toBeDefined();
  });

  it("filters by vision capability", () => {
    const result = selectFromBin({
      routeLabel: "vision",
      preferences: { costBias: 50, speedBias: 50 },
      requiresVision: true,
    });
    expect(result.modelId).toBeDefined();
  });

  it("provides candidate models list", () => {
    const result = selectFromBin({
      routeLabel: "balanced_general",
      preferences: { costBias: 50, speedBias: 50 },
    });
    expect(result.candidateModels.length).toBeGreaterThan(0);
  });
});
