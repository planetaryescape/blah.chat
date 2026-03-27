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
export {
  type ExplorationOptions,
  type ExplorationResult,
  explore,
} from "./exploration";
export { runHardRules } from "./hard-rules";
export {
  buildComparisonStats,
  buildLatestHealthMap,
  buildOutcomeStats,
  scoreCandidate,
  scoreCandidates,
  selectCandidate,
} from "./policy-engine";
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
  adjustExplorationRate,
  evaluateShadowDecisions,
  type ModelHistoricalStats,
  type ShadowDecisionInput,
  type ShadowEvaluation,
  type ShadowModelSummary,
  summarizeShadowPerformance,
} from "./shadow-evaluator";
export {
  type CandidateFeatures,
  type CandidateInput,
  type ClassifierConfig,
  type ClassifierResult,
  type ClassifierRouterResult,
  type ComparisonStats,
  DEFAULT_CLASSIFIER_CONFIG,
  DEFAULT_POLICY_WEIGHTS,
  type DecisionTrace,
  type ModelBin,
  type OutcomeStats,
  type PolicyEngineResult,
  type PolicyWeights,
  type ProviderHealth,
  type ProviderHealthStatus,
  ROUTE_LABELS,
  ROUTER_MODES,
  type RouteLabel,
  type RouterMode,
  type RoutingExample,
  type ScoreComponent,
  type ScoredCandidate,
  type ScoreExplanation,
  type ScoringContext,
} from "./types";
