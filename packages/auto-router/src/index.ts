export { type BinSelectionInput, selectFromBin } from "./bin-selector";
export { ROUTE_BINS } from "./bins";
export { classify } from "./classifier";
export {
  type CostTier,
  getCostTier,
  getEligibleModels,
  getSpeedBonus,
  type ScoredModel,
  scoreModels,
  selectWithExploration,
  TIER_WEIGHTS,
} from "./core";
export { type EmbeddingProvider, singleToProvider } from "./embedding";
export { SEED_EXAMPLES } from "./examples";
export { runHardRules } from "./hard-rules";
export {
  type HighStakesDomain,
  MODEL_CONFIG,
  MODEL_PROFILES,
  type ModelConfigForRouter,
  type ModelProfile,
  type RouterPreferences,
  type RouterResult,
  TASK_CATEGORIES,
  type TaskCategoryId,
  type TaskClassification,
} from "./profiles";
export {
  buildClassificationPrompt,
  type PreviousModelContext,
  ROUTER_CLASSIFICATION_PROMPT,
  ROUTER_REASONING_TEMPLATE,
} from "./prompts";
export {
  createRegistry,
  DEFAULT_REGISTRY,
  type ModelRegistry,
  type RegistryOverrides,
  type RegistryWarning,
  validateRegistry,
} from "./registry";
export {
  type ClassifyInput,
  createRouter,
  type RouteInput,
  type Router,
  type RouterConfig,
  type SelectModelInput,
  type SelectModelResult,
} from "./router";
export {
  type ClassifierConfig,
  type ClassifierResult,
  type ClassifierRouterResult,
  DEFAULT_CLASSIFIER_CONFIG,
  type DecisionTrace,
  type ModelBin,
  ROUTE_LABELS,
  ROUTER_MODES,
  type RouteLabel,
  type RouterMode,
  type RoutingExample,
} from "./types";
