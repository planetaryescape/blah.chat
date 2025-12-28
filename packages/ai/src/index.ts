/**
 * @blah-chat/ai - Shared AI model configuration
 *
 * Used by both web and mobile apps for consistent model handling
 */

export {
  MODEL_CONFIG,
  getProviderDisplayName,
  getModelTier,
  getMobileModels,
} from "./models";

export type {
  ModelConfig,
  Provider,
  Capability,
  SpeedTier,
  CostTier,
  ModelTier,
} from "./types";
