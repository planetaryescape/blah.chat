/** Seed and synchronize the database from the shared model catalog. */
import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { ROUTER_TIEBREAK_MODEL } from "@blah-chat/ai/operational-models";
import { MODEL_PROFILES } from "@blah-chat/auto-router/profiles";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

type ModelSeedData = Omit<
  Doc<"models">,
  | "_id"
  | "_creationTime"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy"
>;

const DEFAULT_ROUTER_CONFIG = {
  stickinessBonus: 25,
  reasoningBonus: 15,
  researchBonus: 25,
  simplePenalty: 0.7,
  complexBoostThreshold: 85,
  complexBoostMultiplier: 1.2,
  cheapThreshold: 1.0,
  midThreshold: 5.0,
  tierWeights: JSON.stringify({
    simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
    moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
    complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
  }),
  speedBonuses: JSON.stringify({
    cerebras: 12,
    groq: 10,
    flash: 8,
    fast: 8,
    nano: 10,
    lite: 10,
    lightning: 12,
    thinking: -5,
    "extended-thinking": -8,
  }),
  routerModelId: ROUTER_TIEBREAK_MODEL.id,
  maxRetries: 3,
  contextBuffer: 1.2,
  longContextThreshold: 128000,
  classifierConfidenceThreshold: 0.82,
  classifierTopK: 5,
  classifierFallbackEnabled: true,
};

export const seedModels = internalMutation({
  args: {
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.clearExisting) {
      for (const model of await ctx.db.query("models").collect()) {
        await ctx.db.delete(model._id);
      }
      for (const profile of await ctx.db.query("modelProfiles").collect()) {
        await ctx.db.delete(profile._id);
      }
      for (const config of await ctx.db.query("autoRouterConfig").collect()) {
        await ctx.db.delete(config._id);
      }
    }

    let modelsInserted = 0;
    let modelsUpdated = 0;
    let totalModels = 0;

    for (const config of Object.values(MODEL_CONFIG)) {
      // Auto is a routing mode, not an inference model or database provider.
      if (config.provider === "auto") continue;
      if (
        config.gateway &&
        config.gateway !== "vercel" &&
        config.gateway !== "openrouter"
      ) {
        throw new Error(
          `Unsupported catalog gateway for ${config.id}: ${config.gateway}`,
        );
      }

      const model: ModelSeedData = {
        modelId: config.id,
        provider: config.provider,
        name: config.name,
        description: config.description,
        contextWindow: config.contextWindow,
        inputCost: config.pricing.input,
        outputCost: config.pricing.output,
        cachedInputCost: config.pricing.cached,
        reasoningCost: config.pricing.reasoning,
        capabilities: config.capabilities,
        reasoningConfig: config.reasoning
          ? JSON.stringify(config.reasoning)
          : undefined,
        gateway: config.gateway,
        hostOrder: config.hostOrder,
        actualModelId: config.actualModelId,
        isLocal: config.isLocal,
        knowledgeCutoff: config.knowledgeCutoff,
        userFriendlyDescription: config.userFriendlyDescription,
        bestFor: config.bestFor,
        benchmarks: config.benchmarks
          ? JSON.stringify(config.benchmarks)
          : undefined,
        speedTier: config.speedTier,
        isPro: config.isPro,
        isInternalOnly: config.isInternalOnly,
        isExperimental: config.isExperimental,
        status: config.isDeprecated ? "deprecated" : "active",
      };
      totalModels++;

      const existing = await ctx.db
        .query("models")
        .withIndex("by_modelId", (q) => q.eq("modelId", model.modelId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...model, updatedAt: now });
        modelsUpdated++;
      } else {
        await ctx.db.insert("models", {
          ...model,
          createdAt: now,
          updatedAt: now,
        });
        modelsInserted++;
      }
    }

    let profilesInserted = 0;
    const profiles = Object.values(MODEL_PROFILES).filter(
      (profile) => MODEL_CONFIG[profile.modelId],
    );
    for (const profile of profiles) {
      const existing = await ctx.db
        .query("modelProfiles")
        .withIndex("by_modelId", (q) => q.eq("modelId", profile.modelId))
        .first();

      if (!existing) {
        await ctx.db.insert("modelProfiles", {
          modelId: profile.modelId,
          qualityScore: profile.qualityScore,
          categoryScores: JSON.stringify(profile.categoryScores),
          updatedAt: now,
        });
        profilesInserted++;
      }
    }

    const existingConfig = await ctx.db.query("autoRouterConfig").first();
    if (!existingConfig) {
      await ctx.db.insert("autoRouterConfig", {
        ...DEFAULT_ROUTER_CONFIG,
        updatedAt: now,
      });
    }

    return {
      modelsInserted,
      modelsUpdated,
      profilesInserted,
      configInserted: !existingConfig,
      totalModels,
      totalProfiles: profiles.length,
    };
  },
});
