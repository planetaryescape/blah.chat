import { getMobileModels, MODEL_CONFIG } from "@blah-chat/ai/models";
import { getModel } from "@blah-chat/ai/registry";
import { describe, expect, it } from "vitest";
import { getStaticModel, getStaticModels } from "../repository";

describe("restored model catalog", () => {
  it.each([
    ["openrouter:claude-opus-4.8", "anthropic/claude-opus-4.8"],
    ["openrouter:gpt-5.5", "openai/gpt-5.5"],
    ["openrouter:gemini-3.5-flash", "google/gemini-3.5-flash"],
    ["openrouter:nemotron-3-ultra-550b", "nvidia/nemotron-3-ultra-550b-a55b"],
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
      getMobileModels().some((model) => model.id === "openrouter:gpt-5.5"),
    ).toBe(true);
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
