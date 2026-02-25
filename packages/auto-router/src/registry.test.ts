import { describe, expect, it } from "vitest";
import { ROUTE_BINS } from "./bins";
import { MODEL_CONFIG, MODEL_PROFILES } from "./profiles";
import { createRegistry, DEFAULT_REGISTRY, validateRegistry } from "./registry";

describe("DEFAULT_REGISTRY", () => {
  it("contains the built-in models, profiles, and bins", () => {
    expect(DEFAULT_REGISTRY.models).toBe(MODEL_CONFIG);
    expect(DEFAULT_REGISTRY.profiles).toBe(MODEL_PROFILES);
    expect(DEFAULT_REGISTRY.bins).toBe(ROUTE_BINS);
  });
});

describe("createRegistry", () => {
  it("returns defaults when no overrides provided", () => {
    const registry = createRegistry();
    expect(Object.keys(registry.models)).toEqual(Object.keys(MODEL_CONFIG));
    expect(Object.keys(registry.profiles)).toEqual(Object.keys(MODEL_PROFILES));
    expect(Object.keys(registry.bins)).toEqual(Object.keys(ROUTE_BINS));
  });

  it("replaces models entirely when overridden", () => {
    const customModels = {
      "custom:model-a": {
        id: "custom:model-a",
        name: "Model A",
        contextWindow: 100000,
        pricing: { input: 1, output: 2 },
        capabilities: ["vision"],
      },
    };

    const registry = createRegistry({ models: customModels });
    expect(Object.keys(registry.models)).toEqual(["custom:model-a"]);
    expect(registry.profiles).toEqual(MODEL_PROFILES);
  });

  it("replaces bins entirely when overridden", () => {
    const customBins = {
      fast_cheap_chat: {
        label: "fast_cheap_chat" as const,
        description: "Custom fast bin",
        primary: ["openai:gpt-5-nano"],
        fallbacks: [],
      },
    };

    const registry = createRegistry({ bins: customBins });
    expect(Object.keys(registry.bins)).toEqual(["fast_cheap_chat"]);
  });
});

describe("validateRegistry", () => {
  it("returns default registry without warnings", () => {
    const { registry, warnings } = validateRegistry(DEFAULT_REGISTRY);
    expect(warnings).toEqual([]);
    expect(Object.keys(registry.bins)).toEqual(Object.keys(ROUTE_BINS));
  });

  it("strips orphaned model refs from bins and warns", () => {
    const registry = createRegistry({
      models: {
        "real:model": {
          id: "real:model",
          name: "Real Model",
          contextWindow: 100000,
          pricing: { input: 1, output: 2 },
          capabilities: [],
        },
      },
      bins: {
        fast_cheap_chat: {
          label: "fast_cheap_chat" as const,
          description: "Test bin",
          primary: ["real:model", "fake:model-1"],
          fallbacks: ["fake:model-2"],
        },
      },
    });

    const { registry: cleaned, warnings } = validateRegistry(registry);

    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("orphaned_model_in_bin");
    expect(warnings[0].modelId).toBe("fake:model-1");
    expect(warnings[1].modelId).toBe("fake:model-2");

    expect(cleaned.bins.fast_cheap_chat.primary).toEqual(["real:model"]);
    expect(cleaned.bins.fast_cheap_chat.fallbacks).toEqual([]);
  });

  it("preserves bins with all valid models", () => {
    const registry = createRegistry({
      models: {
        "a:model": {
          id: "a:model",
          name: "A",
          contextWindow: 100000,
          pricing: { input: 1, output: 2 },
          capabilities: [],
        },
        "b:model": {
          id: "b:model",
          name: "B",
          contextWindow: 100000,
          pricing: { input: 1, output: 2 },
          capabilities: [],
        },
      },
      bins: {
        fallback_default: {
          label: "fallback_default" as const,
          description: "Fallback",
          primary: ["a:model"],
          fallbacks: ["b:model"],
        },
      },
    });

    const { warnings } = validateRegistry(registry);
    expect(warnings).toEqual([]);
  });
});
