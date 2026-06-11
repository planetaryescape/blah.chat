import { describe, expect, it, vi } from "vitest";
import type { EmbeddingProvider } from "./embedding";
import { SEED_EXAMPLES } from "./examples";
import { createRouter } from "./router";

function mockEmbeddingProvider(dim = 3): EmbeddingProvider {
  return {
    embedBatch: vi.fn(async (texts: string[]) =>
      texts.map((t) => {
        const seed = t.length;
        return Array.from({ length: dim }, (_, i) => Math.sin(seed * (i + 1)));
      }),
    ),
  };
}

describe("createRouter", () => {
  it("constructs with defaults", () => {
    const router = createRouter();
    expect(router.registry).toBeDefined();
    expect(Object.keys(router.registry.models).length).toBeGreaterThan(0);
    expect(Object.keys(router.registry.bins).length).toBeGreaterThan(0);
  });

  it("constructs with custom models/bins", () => {
    const router = createRouter({
      models: {
        "custom:fast": {
          id: "custom:fast",
          name: "Custom Fast",
          contextWindow: 100000,
          pricing: { input: 0.1, output: 0.2 },
          capabilities: [],
        },
      },
      bins: {
        fallback_default: {
          label: "fallback_default" as const,
          description: "Default",
          primary: ["custom:fast"],
          fallbacks: [],
        },
      },
    });

    expect(Object.keys(router.registry.models)).toEqual(["custom:fast"]);
  });

  it("warns on orphaned model refs in bins", () => {
    const warnings: string[] = [];
    createRouter({
      models: {
        "real:model": {
          id: "real:model",
          name: "Real",
          contextWindow: 100000,
          pricing: { input: 1, output: 2 },
          capabilities: [],
        },
      },
      bins: {
        fallback_default: {
          label: "fallback_default" as const,
          description: "Fallback",
          primary: ["real:model", "ghost:model"],
          fallbacks: [],
        },
      },
      onWarning: (msg) => warnings.push(msg),
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("ghost:model");
  });
});

describe("router.selectModel", () => {
  it("selects from default bins without embedding provider", () => {
    const router = createRouter();
    const result = router.selectModel({
      routeLabel: "code_heavy",
    });

    expect(result.modelId).toBeDefined();
    expect(result.candidatesConsidered).toBeGreaterThan(0);
  });

  it("uses custom registry for model selection", () => {
    const router = createRouter({
      models: {
        "my:model": {
          id: "my:model",
          name: "My Model",
          contextWindow: 200000,
          pricing: { input: 0.5, output: 1.0 },
          capabilities: ["vision"],
        },
      },
      bins: {
        fallback_default: {
          label: "fallback_default" as const,
          description: "Default",
          primary: ["my:model"],
          fallbacks: [],
        },
      },
    });

    const result = router.selectModel({
      routeLabel: "fallback_default",
    });

    expect(result.modelId).toBe("my:model");
  });

  it("uses custom fallbackModelId when all bins exhausted", () => {
    const router = createRouter({
      models: {
        "my:fallback": {
          id: "my:fallback",
          name: "Fallback",
          contextWindow: 100000,
          pricing: { input: 0.1, output: 0.2 },
          capabilities: [],
        },
      },
      bins: {
        fallback_default: {
          label: "fallback_default" as const,
          description: "Default",
          primary: [],
          fallbacks: [],
        },
      },
      fallbackModelId: "my:fallback",
    });

    const result = router.selectModel({
      routeLabel: "fallback_default",
    });

    expect(result.modelId).toBe("my:fallback");
  });
});

describe("router.classify", () => {
  it("throws without embedding provider", async () => {
    const router = createRouter();
    await expect(router.classify({ message: "hello" })).rejects.toThrow(
      "embeddingProvider is required",
    );
  });

  it("calls embedding provider and returns classification", async () => {
    const provider = mockEmbeddingProvider();
    const router = createRouter({
      embeddingProvider: provider,
      examples: SEED_EXAMPLES.slice(0, 10),
    });

    const result = await router.classify({
      message: "write some python code",
    });

    expect(result.routeLabel).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(provider.embedBatch).toHaveBeenCalled();
  });

  it("uses hard rules before embeddings", async () => {
    const provider = mockEmbeddingProvider();
    const router = createRouter({
      embeddingProvider: provider,
      examples: SEED_EXAMPLES.slice(0, 5),
    });

    const result = await router.classify({
      message: "search for the latest news about AI",
    });

    expect(result.routeLabel).toBe("research");
    expect(result.hardRuleMatched).toBe("research_keywords");
  });
});

describe("router.route", () => {
  it("end-to-end: classifies and selects model", async () => {
    const provider = mockEmbeddingProvider();
    const router = createRouter({
      embeddingProvider: provider,
      examples: SEED_EXAMPLES.slice(0, 20),
    });

    const result = await router.route({
      message: "search for recent news about TypeScript 6",
    });

    expect(result.selectedModelId).toBeDefined();
    expect(result.routeLabel).toBeDefined();
    expect(result.classifierVersion).toBe("classifier_v1");
    expect(result.trace).toBeDefined();
    expect(result.candidatesConsidered).toBeGreaterThanOrEqual(0);
  });
});

describe("router.classify LLM fallback tiebreak", () => {
  const AMBIGUOUS_EXAMPLES = [
    {
      text: "alpha",
      routeLabel: "code_heavy" as const,
      embedding: [1, 0, 0],
    },
    {
      text: "beta",
      routeLabel: "creative_writing" as const,
      embedding: [0, 1, 0],
    },
  ];

  /** Message embeds equidistant from both examples → ambiguous split. */
  function ambiguousProvider(): EmbeddingProvider {
    return {
      embedBatch: vi.fn(async (texts: string[]) =>
        texts.map(() => [0.7, 0.7, 0]),
      ),
    };
  }

  it("resolves ambiguous classification via the tiebreak hook", async () => {
    const llmFallback = vi.fn(async () => "creative_writing");
    const router = createRouter({
      embeddingProvider: ambiguousProvider(),
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
    });

    const result = await router.classify({
      message: "tell me about gardens",
    });

    expect(llmFallback).toHaveBeenCalledWith({
      message: "tell me about gardens",
      candidateLabels: expect.arrayContaining([
        "code_heavy",
        "creative_writing",
      ]),
    });
    expect(result.routeLabel).toBe("creative_writing");
    expect(result.usedFallbackLlm).toBe(true);
    expect(result.needsFallback).toBe(false);
  });

  it("matches tiebreak labels case-insensitively with whitespace", async () => {
    const llmFallback = vi.fn(async () => "  Creative_Writing\n");
    const router = createRouter({
      embeddingProvider: ambiguousProvider(),
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
    });

    const result = await router.classify({ message: "tell me about gardens" });

    expect(result.routeLabel).toBe("creative_writing");
    expect(result.usedFallbackLlm).toBe(true);
  });

  it("keeps the classifier label when the hook returns an unknown label", async () => {
    const llmFallback = vi.fn(async () => "not_a_label");
    const router = createRouter({
      embeddingProvider: ambiguousProvider(),
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
    });

    const result = await router.classify({ message: "tell me about gardens" });

    expect(["code_heavy", "creative_writing"]).toContain(result.routeLabel);
    expect(result.usedFallbackLlm).toBeUndefined();
    expect(result.needsFallback).toBe(true);
  });

  it("keeps the classifier label and warns when the hook throws", async () => {
    const warnings: string[] = [];
    const llmFallback = vi.fn(async () => {
      throw new Error("provider down");
    });
    const router = createRouter({
      embeddingProvider: ambiguousProvider(),
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
      onWarning: (msg) => warnings.push(msg),
    });

    const result = await router.classify({ message: "tell me about gardens" });

    expect(["code_heavy", "creative_writing"]).toContain(result.routeLabel);
    expect(result.needsFallback).toBe(true);
    expect(warnings.some((w) => w.includes("provider down"))).toBe(true);
  });

  it("does not invoke the hook on confident classifications", async () => {
    const llmFallback = vi.fn(async () => "creative_writing");
    const provider: EmbeddingProvider = {
      // Message embeds exactly on the code_heavy example → confident.
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
    };
    const router = createRouter({
      embeddingProvider: provider,
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
    });

    const result = await router.classify({ message: "tell me about gardens" });

    expect(llmFallback).not.toHaveBeenCalled();
    expect(result.routeLabel).toBe("code_heavy");
    expect(result.needsFallback).toBe(false);
  });

  it("does not invoke the hook when fallback is disabled via config", async () => {
    const llmFallback = vi.fn(async () => "creative_writing");
    const router = createRouter({
      embeddingProvider: ambiguousProvider(),
      examples: AMBIGUOUS_EXAMPLES,
      llmFallback,
      classifierConfig: { fallbackEnabled: false },
    });

    const result = await router.classify({ message: "tell me about gardens" });

    expect(llmFallback).not.toHaveBeenCalled();
    expect(result.needsFallback).toBe(false);
  });
});
