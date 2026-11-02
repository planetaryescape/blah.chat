import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api, internal } from "../_generated/api";
import schema from "../schema";

describe("shared model catalog seed", () => {
  it("seeds a fresh deployment with modern models, gateways, prices and lifecycle status", async () => {
    const t = convexTest(schema);
    const result = await t.mutation(internal.models.seed.seedModels, {});
    const models = await t.run(async (ctx) => ctx.db.query("models").collect());

    expect(result.modelsInserted).toBe(Object.keys(MODEL_CONFIG).length - 1);
    expect(models.some((model) => model.modelId === "auto")).toBe(false);
    expect(
      models.find((model) => model.modelId === "openai:gpt-oss-120b"),
    ).toMatchObject({
      gateway: "groq",
      actualModelId: "openai/gpt-oss-120b",
      status: "active",
    });
    expect(
      models.find((model) => model.modelId === "openrouter:claude-opus-4.8"),
    ).toMatchObject({
      gateway: "openrouter",
      actualModelId: "anthropic/claude-opus-4.8",
      contextWindow: 1000000,
      inputCost: 5,
      outputCost: 25,
      status: "deprecated",
    });
    expect(
      models.find(
        (model) => model.modelId === "openrouter:nemotron-3-ultra-550b",
      ),
    ).toMatchObject({
      provider: "nvidia",
      gateway: "openrouter",
      actualModelId: "nvidia/nemotron-3-ultra-550b-a55b",
    });
    expect(
      models.find((model) => model.modelId === "openai:gpt-5.1"),
    ).toMatchObject({
      status: "deprecated",
    });
    const activeModels = await t.query(api.models.queries.list, {});
    expect(
      activeModels.some((model) => model.modelId === "openai:gpt-5.1"),
    ).toBe(false);
    expect(
      activeModels.some((model) => model.modelId === "openrouter:gpt-6.1-sol"),
    ).toBe(true);
    expect(
      activeModels.some((model) => model.modelId === "openrouter:gpt-5.5"),
    ).toBe(false);
    expect(
      models.find((model) => model.modelId === "openrouter:gpt-6.1-sol"),
    ).toMatchObject({
      actualModelId: "openai/gpt-6.1-sol",
      inputCost: 2,
      outputCost: 10,
      pricingTiers: [
        { minInputTokens: 272000, input: 4, output: 15, cached: 0.2 },
      ],
    });

    const config = await t.run(async (ctx) =>
      ctx.db.query("autoRouterConfig").first(),
    );
    expect(config?.routerModelId).toBe("openai:gpt-oss-120b");
  });

  it("synchronizes known entries without duplicating models or removing custom models", async () => {
    const t = convexTest(schema);
    await t.mutation(internal.models.seed.seedModels, {});
    await t.run(async (ctx) => {
      const model = await ctx.db
        .query("models")
        .withIndex("by_modelId", (q) => q.eq("modelId", "openai:gpt-5"))
        .unique();
      if (!model) throw new Error("Expected seeded GPT-5");
      await ctx.db.patch(model._id, {
        actualModelId: "stale-model",
        inputCost: 99,
      });
      await ctx.db.insert("models", {
        modelId: "openai:custom-model",
        provider: "openai",
        name: "Custom model",
        contextWindow: 4096,
        inputCost: 1,
        outputCost: 2,
        capabilities: [],
        status: "active",
        createdAt: 1,
        updatedAt: 1,
      });
    });

    const result = await t.mutation(internal.models.seed.seedModels, {});
    const models = await t.run(async (ctx) => ctx.db.query("models").collect());
    expect(result.modelsInserted).toBe(0);
    expect(
      models.filter((model) => model.modelId === "openai:gpt-5"),
    ).toHaveLength(1);
    expect(
      models.find((model) => model.modelId === "openai:gpt-5"),
    ).toMatchObject({
      actualModelId: "gpt-5.3-chat-latest",
      inputCost: 1.75,
    });
    expect(
      models.find((model) => model.modelId === "openai:custom-model"),
    ).toMatchObject({
      inputCost: 1,
      outputCost: 2,
    });
  });
});
