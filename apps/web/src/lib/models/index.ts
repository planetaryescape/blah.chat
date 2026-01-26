/**
 * Model Management - Public API
 *
 * Re-exports for clean imports:
 *
 * import {
 *   useModels,
 *   useModel,
 *   getStaticModel,
 *   USE_DB_MODELS,
 * } from "@/lib/models";
 */

// Hooks and utilities
export {
  getModelName,
  getModelProvider,
  getProviders,
  getStaticModel,
  getStaticModels,
  isDbModelsEnabled,
  modelExists,
  USE_DB_MODELS,
  useAllModels,
  useModel,
  useModelHistory,
  useModelProfiles,
  useModelStats,
  useModels,
  useRouterConfig,
} from "./repository";

// Transforms
export {
  dbModelsToConfigRecord,
  dbToModelConfig,
  modelConfigToDb,
} from "./transforms";
