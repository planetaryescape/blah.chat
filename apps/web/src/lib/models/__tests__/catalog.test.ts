import {
  DEFAULT_MODEL_ID,
  getMobileModels,
  MODEL_CONFIG,
} from "@blah-chat/ai/models";
import {
  DESIGN_SYSTEM_GENERATION_MODEL,
  DOCUMENT_EXTRACTION_MODEL,
  MEMORY_EXTRACTION_MODEL,
  ROUTER_TIEBREAK_MODEL,
  TITLE_GENERATION_MODEL,
} from "@blah-chat/ai/operational-models";
import { getModel, getModelWithGateway } from "@blah-chat/ai/registry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStaticModel, getStaticModels } from "../repository";

describe("restored model catalog", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("CEREBRAS_API_KEY", "test-cerebras-key");
    vi.stubEnv(
      "OPENROUTER_API_KEY",
      "test-openrouter-key-not-used-for-network",
    );
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    [TITLE_GENERATION_MODEL, "openai/gpt-oss-120b", "groq"],
    [MEMORY_EXTRACTION_MODEL, "openai/gpt-oss-120b", "groq"],
    [DOCUMENT_EXTRACTION_MODEL, "google/gemini-3-flash", "vercel"],
    [DESIGN_SYSTEM_GENERATION_MODEL, "openai/gpt-oss-120b", "groq"],
    [ROUTER_TIEBREAK_MODEL, "openai/gpt-oss-120b", "groq"],
  ] as const)("preserves direct text and optional multimodal routes (case %#)", (model, gatewayModelId, gateway) => {
    expect(model.gateway ?? "vercel").toBe(gateway);
    expect(model.isDeprecated).not.toBe(true);
    expect(getModel(model.id).modelId).toBe(gatewayModelId);
  });

  it("uses the verified direct model for new chats and Cerebras when Groq is not configured", () => {
    expect(DEFAULT_MODEL_ID).toBe("openai:gpt-oss-120b");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(getModel(DEFAULT_MODEL_ID).modelId).toBe("gpt-oss-120b");
    expect(getModelWithGateway(DEFAULT_MODEL_ID, "groq").modelId).toBe(
      "openai/gpt-oss-120b",
    );
    expect(getModelWithGateway(DEFAULT_MODEL_ID, "cerebras").modelId).toBe(
      "gpt-oss-120b",
    );
  });

  it.each([
    ["openrouter:claude-opus-4.8", "anthropic/claude-opus-4.8"],
    ["openrouter:gpt-5.5", "openai/gpt-5.5"],
    ["openrouter:gemini-3.5-flash", "google/gemini-3.5-flash"],
    ["openrouter:nemotron-3-ultra-550b", "nvidia/nemotron-3-ultra-550b-a55b"],
    ["openrouter:claude-opus-5.5", "anthropic/claude-opus-5.5"],
    ["openrouter:gpt-6.1-sol", "openai/gpt-6.1-sol"],
    ["openrouter:gemini-4-argon", "google/gemini-4-argon"],
  ])("routes %s through its configured OpenRouter model", (id, actualModelId) => {
    expect(MODEL_CONFIG[id].gateway).toBe("openrouter");
    expect(getModel(id).modelId).toBe(actualModelId);
  });

  it("retains the stable GPT-5 ID while routing to the current chat model", () => {
    expect(getModel("openai:gpt-5").modelId).toBe("openai/gpt-5.3-chat-latest");
    expect(MODEL_CONFIG["openai:gpt-5"].capabilities).not.toContain("thinking");
  });

  it("keeps legacy model metadata resolvable without advertising deprecated models", () => {
    expect(getStaticModel("openrouter:deepseek-r1-0528")).toMatchObject({
      actualModelId: "deepseek/deepseek-r1-0528:free",
      isDeprecated: true,
    });
    expect(getStaticModels()).not.toHaveProperty("openrouter:deepseek-r1-0528");
    expect(getStaticModels({ includeDeprecated: true })).toHaveProperty(
      "openrouter:deepseek-r1-0528",
    );
    expect(getMobileModels().some((model) => model.isDeprecated)).toBe(false);
    expect(
      getMobileModels().some((model) => model.id === "openrouter:gpt-6.1-sol"),
    ).toBe(true);
    expect(
      getMobileModels().some((model) => model.id === "openrouter:gpt-5.5"),
    ).toBe(false);
    expect(getStaticModel("openrouter:gpt-5.5")?.actualModelId).toBe(
      "openai/gpt-5.5",
    );
  });

  it("keeps modern token prices for cost tracking", () => {
    expect(MODEL_CONFIG["openai:gpt-5.4-pro"].pricing).toEqual({
      input: 30,
      output: 180,
    });
    expect(MODEL_CONFIG["openrouter:gemini-3.1-flash-lite"].pricing).toEqual({
      input: 0.25,
      output: 1.5,
      cached: 0.025,
    });
  });
});
