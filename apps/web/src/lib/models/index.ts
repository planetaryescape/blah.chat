/**
 * Model Management - Public API
 *
 * Re-exports for clean imports:
 *
 * import {
 *   useModels,
 *   useModel,
 *   getStaticModel,
 * } from "@/lib/models";
 */

// Hooks and utilities
export {
  getModelName,
  getModelProvider,
  getProviders,
  getStaticModel,
  getStaticModels,
  modelExists,
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
