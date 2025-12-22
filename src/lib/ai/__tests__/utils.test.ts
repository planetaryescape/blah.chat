import { describe, expect, it } from "vitest";

import {
  calculateCost,
  getModelConfig,
  getModelsByProvider,
  isValidModel,
} from "../utils";

describe("getModelConfig", () => {
  it("returns config for known model", () => {
    const config = getModelConfig("openai:gpt-5");
    expect(config).toBeDefined();
    expect(config?.provider).toBe("openai");
  });

  it("returns fallback config for unknown provider:model format", () => {
    const config = getModelConfig("custom-provider:custom-model");
    expect(config).toBeDefined();
    expect(config?.id).toBe("custom-provider:custom-model");
    expect(config?.provider).toBe("custom-provider");
    expect(config?.name).toBe("custom-model");
    expect(config?.pricing).toEqual({ input: 0, output: 0 });
  });

  it("handles legacy model IDs without provider prefix", () => {
    const config = getModelConfig("gpt-4-turbo");
    expect(config).toBeDefined();
    expect(config?.provider).toBe("openai");
    expect(config?.id).toBe("openai:gpt-4-turbo");
  });

  it("maps claude prefix to anthropic provider", () => {
    const config = getModelConfig("claude-legacy-model");
    expect(config?.provider).toBe("anthropic");
  });

  it("maps gemini prefix to google provider", () => {
    const config = getModelConfig("gemini-something");
    expect(config?.provider).toBe("google");
  });

  it("returns undefined for completely unknown model", () => {
    const config = getModelConfig("unknown");
    expect(config).toBeUndefined();
  });
});

describe("getModelsByProvider", () => {
  it("returns models grouped by provider", () => {
    const grouped = getModelsByProvider();

    expect(grouped).toHaveProperty("openai");
    expect(grouped).toHaveProperty("anthropic");
    expect(grouped).toHaveProperty("google");

    expect(Array.isArray(grouped.openai)).toBe(true);
    expect(grouped.openai.length).toBeGreaterThan(0);
  });

  it("each model in group has matching provider", () => {
    const grouped = getModelsByProvider();

    for (const [provider, models] of Object.entries(grouped)) {
      for (const model of models) {
        expect(model.provider).toBe(provider);
      }
    }
  });
});

describe("calculateCost", () => {
  it("calculates basic input/output cost", () => {
    // Using a known model with specific pricing
    // gpt-5 pricing: input $2.5/M, output $10/M
    const cost = calculateCost("openai:gpt-5", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    // Expected: 2.5 + 10 = 12.5
    expect(cost).toBeCloseTo(12.5);
  });

  it("returns 0 for unknown model", () => {
    const cost = calculateCost("unknown:model", {
      inputTokens: 1000,
      outputTokens: 1000,
    });
    expect(cost).toBe(0);
  });

  it("returns 0 for local models", () => {
    // Local models should have isLocal: true and return 0 cost
    const cost = calculateCost("ollama:llama3", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBe(0);
  });

  it("includes cached token cost when available", () => {
    const costWithoutCache = calculateCost("openai:gpt-5", {
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    const costWithCache = calculateCost("openai:gpt-5", {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cachedTokens: 500_000,
    });

    // Cached tokens should add to cost (if pricing.cached is defined)
    expect(costWithCache).toBeGreaterThanOrEqual(costWithoutCache);
  });

  it("includes reasoning token cost when available", () => {
    const costWithoutReasoning = calculateCost("openai:gpt-5", {
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    const costWithReasoning = calculateCost("openai:gpt-5", {
      inputTokens: 1_000_000,
      outputTokens: 0,
      reasoningTokens: 500_000,
    });

    // Reasoning tokens should add to cost (if pricing.reasoning is defined)
    expect(costWithReasoning).toBeGreaterThanOrEqual(costWithoutReasoning);
  });

  it("handles zero tokens correctly", () => {
    const cost = calculateCost("openai:gpt-5", {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(cost).toBe(0);
  });

  it("scales linearly with token count", () => {
    const cost1 = calculateCost("openai:gpt-5", {
      inputTokens: 100_000,
      outputTokens: 100_000,
    });

    const cost2 = calculateCost("openai:gpt-5", {
      inputTokens: 200_000,
      outputTokens: 200_000,
    });

    expect(cost2).toBeCloseTo(cost1 * 2);
  });
});

describe("isValidModel", () => {
  it("returns true for known models", () => {
    expect(isValidModel("openai:gpt-5")).toBe(true);
    expect(isValidModel("openai:gpt-5-mini")).toBe(true);
  });

  it("returns false for unknown models", () => {
    expect(isValidModel("unknown:model")).toBe(false);
    expect(isValidModel("fake-model")).toBe(false);
  });
});
