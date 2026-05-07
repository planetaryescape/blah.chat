/**
 * @blah-chat/ai
 *
 * Shared AI config + runtime helpers across web/backend/mobile.
 */

export { getGatewayOptions, getHostOrder } from "./gateway";
export type {
  Capability,
  ModelConfig,
  ModelTier,
  Provider,
} from "./models";
export {
  AUTO_MODEL,
  getMobileModels,
  getModelMetrics,
  getModelTier,
  getProviderDisplayName,
  isAutoModel,
  MODEL_CONFIG,
} from "./models";
export * from "./operational-models";
export * from "./reasoning";
export {
  getModel,
  getModelWithApiKey,
  getModelWithGateway,
} from "./registry";
export type { BenchmarkScores, ComputedMetrics, ModelCategory } from "./types";
export {
  calculateCost,
  getModelConfig,
  getModelsByProvider,
  isValidModel,
  normalizeUsageTokens,
} from "./utils";
