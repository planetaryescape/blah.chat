/**
 * @blah-chat/ai - Shared AI model configuration
 *
 * Used by both web and mobile apps for consistent model handling
 */

export {
  getMobileModels,
  getModelTier,
  getProviderDisplayName,
  MODEL_CONFIG,
} from "./models";

export type {
  Capability,
  CostTier,
  ModelConfig,
  ModelTier,
  Provider,
  SpeedTier,
} from "./types";
