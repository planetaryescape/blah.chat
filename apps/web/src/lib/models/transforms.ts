/**
 * Model Transforms
 *
 * Transform between DB model format and ModelConfig interface.
 */

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import type { ModelConfig } from "@/lib/ai/models";
import type { ReasoningConfig } from "@/lib/ai/reasoning/types";

type DbModel = Doc<"models">;

/**
 * Safely parse JSON with fallback to undefined
 */
function safeJsonParse<T>(json: string | undefined): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.error("Failed to parse JSON:", json.slice(0, 100));
    return undefined;
  }
}

/**
 * Transform DB model to ModelConfig
 */
export function dbToModelConfig(dbModel: DbModel): ModelConfig {
  return {
    id: dbModel.modelId,
    provider: dbModel.provider as ModelConfig["provider"],
    name: dbModel.name,
    description: dbModel.description,
    contextWindow: dbModel.contextWindow,
    pricing: {
      input: dbModel.inputCost,
      output: dbModel.outputCost,
      cached: dbModel.cachedInputCost,
      reasoning: dbModel.reasoningCost,
    },
    capabilities: dbModel.capabilities as ModelConfig["capabilities"],
    isLocal: dbModel.isLocal,
    actualModelId: dbModel.actualModelId,
    reasoning: safeJsonParse<ReasoningConfig>(dbModel.reasoningConfig),
    hostOrder: dbModel.hostOrder,
    isExperimental: dbModel.isExperimental,
    knowledgeCutoff: dbModel.knowledgeCutoff,
    gateway: dbModel.gateway as ModelConfig["gateway"],
    userFriendlyDescription: dbModel.userFriendlyDescription,
    bestFor: dbModel.bestFor,
    benchmarks: safeJsonParse(dbModel.benchmarks),
    speedTier: dbModel.speedTier as ModelConfig["speedTier"],
    isPro: dbModel.isPro,
    isInternalOnly: dbModel.isInternalOnly,
  };
}

/**
 * Transform ModelConfig to DB model format (for seeding/admin)
 */
export function modelConfigToDb(
  config: ModelConfig,
): Omit<
  DbModel,
  | "_id"
  | "_creationTime"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy"
> {
  return {
    modelId: config.id,
    provider: config.provider as DbModel["provider"],
    name: config.name,
    description: config.description,
    contextWindow: config.contextWindow,
    inputCost: config.pricing.input,
    outputCost: config.pricing.output,
    cachedInputCost: config.pricing.cached,
    reasoningCost: config.pricing.reasoning,
    capabilities: config.capabilities as DbModel["capabilities"],
    isLocal: config.isLocal,
    actualModelId: config.actualModelId,
    reasoningConfig: config.reasoning
      ? JSON.stringify(config.reasoning)
      : undefined,
    hostOrder: config.hostOrder,
    isExperimental: config.isExperimental,
    knowledgeCutoff: config.knowledgeCutoff,
    gateway: config.gateway as DbModel["gateway"],
    userFriendlyDescription: config.userFriendlyDescription,
    bestFor: config.bestFor,
    benchmarks: config.benchmarks
      ? JSON.stringify(config.benchmarks)
      : undefined,
    speedTier: config.speedTier as DbModel["speedTier"],
    isPro: config.isPro,
    isInternalOnly: config.isInternalOnly,
    status: "active",
  };
}

/**
 * Transform multiple DB models to ModelConfig record
 */
export function dbModelsToConfigRecord(
  dbModels: DbModel[],
): Record<string, ModelConfig> {
  const record: Record<string, ModelConfig> = {};
  for (const model of dbModels) {
    record[model.modelId] = dbToModelConfig(model);
  }
  return record;
}
