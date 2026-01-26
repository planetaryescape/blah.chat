/**
 * Model Repository
 *
 * Abstraction layer for model configuration.
 * Supports both DB-backed (via Convex) and static sources.
 *
 * Usage:
 * - In React components: use useModels(), useModel(id) hooks
 * - In server code: use getStaticModels() for fallback
 *
 * Feature flag: NEXT_PUBLIC_USE_DB_MODELS=true enables DB-backed models
 */

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AUTO_MODEL, MODEL_CONFIG, type ModelConfig } from "@/lib/ai/models";
import { dbModelsToConfigRecord, dbToModelConfig } from "./transforms";

/**
 * Feature flag for DB-backed models
 */
export const USE_DB_MODELS = process.env.NEXT_PUBLIC_USE_DB_MODELS === "true";

// Type cast helpers to work around Convex type depth issues with 90+ modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typedQuery = useQuery as any;

// Lazy load the api to avoid type depth issues at module load time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modelsApi: any = null;
function getModelsApi() {
  if (!_modelsApi) {
    // Dynamic require to avoid type inference at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { api } = require("@blah-chat/backend/convex/_generated/api");
    _modelsApi = api.models;
  }
  return _modelsApi;
}

// ============================================================================
// React Hooks (client-side, reactive)
// ============================================================================

/**
 * Hook to get all available models
 * Uses Convex reactive queries when DB mode is enabled
 *
 * @param options.includeDeprecated - Include deprecated models
 * @param options.includeInternalOnly - Include internal-only models (admin)
 * @returns Record of model IDs to ModelConfig
 */
export function useModels(options?: {
  includeDeprecated?: boolean;
  includeInternalOnly?: boolean;
}): Record<string, ModelConfig> {
  const dbModels = typedQuery(
    getModelsApi().queries.list,
    USE_DB_MODELS
      ? {
          includeDeprecated: options?.includeDeprecated,
          includeInternalOnly: options?.includeInternalOnly,
        }
      : "skip",
  ) as Doc<"models">[] | undefined;

  // While loading or if DB mode disabled, return static config
  if (!USE_DB_MODELS || !dbModels) {
    return filterStaticModels(options);
  }

  // Transform DB models and include AUTO_MODEL
  const configs = dbModelsToConfigRecord(dbModels);
  configs.auto = AUTO_MODEL;

  return configs;
}

/**
 * Hook to get a single model by ID
 * Provides fallback to static config if model not in DB
 *
 * @param modelId - Model ID (e.g., "openai:gpt-5")
 * @returns ModelConfig or undefined
 */
export function useModel(modelId: string | undefined): ModelConfig | undefined {
  // Handle auto model directly
  if (modelId === "auto") {
    return AUTO_MODEL;
  }

  const dbModel = typedQuery(
    getModelsApi().queries.getById,
    USE_DB_MODELS && modelId ? { modelId } : "skip",
  ) as Doc<"models"> | null | undefined;

  // If DB mode disabled, use static
  if (!USE_DB_MODELS) {
    return modelId ? MODEL_CONFIG[modelId] : undefined;
  }

  // If modelId undefined, return undefined
  if (!modelId) {
    return undefined;
  }

  // If found in DB, transform and return
  if (dbModel) {
    return dbToModelConfig(dbModel);
  }

  // Fallback to static for models not yet in DB (or still loading)
  return MODEL_CONFIG[modelId];
}

/**
 * Hook to get model profiles for auto-router
 */
export function useModelProfiles(): Doc<"modelProfiles">[] | undefined {
  return typedQuery(
    getModelsApi().queries.listProfiles,
    USE_DB_MODELS ? {} : "skip",
  ) as Doc<"modelProfiles">[] | undefined;
}

/**
 * Hook to get auto-router configuration
 */
export function useRouterConfig(): Doc<"autoRouterConfig"> | null | undefined {
  return typedQuery(
    getModelsApi().queries.getRouterConfig,
    USE_DB_MODELS ? {} : "skip",
  ) as Doc<"autoRouterConfig"> | null | undefined;
}

/**
 * Hook to get model history
 */
export function useModelHistory(
  modelId: string | undefined,
  limit?: number,
): Doc<"modelHistory">[] | undefined {
  return typedQuery(
    getModelsApi().queries.getHistory,
    USE_DB_MODELS && modelId ? { modelId, limit } : "skip",
  ) as Doc<"modelHistory">[] | undefined;
}

/**
 * Hook to get model stats (for admin)
 */
export function useModelStats():
  | {
      total: number;
      byStatus: { active: number; deprecated: number; beta: number };
      byProvider: Record<string, number>;
    }
  | undefined {
  return typedQuery(
    getModelsApi().queries.getStats,
    USE_DB_MODELS ? {} : "skip",
  ) as
    | {
        total: number;
        byStatus: { active: number; deprecated: number; beta: number };
        byProvider: Record<string, number>;
      }
    | undefined;
}

/**
 * Hook to get all models including internal (for admin)
 */
export function useAllModels(): Doc<"models">[] | undefined {
  return typedQuery(
    getModelsApi().queries.listAll,
    USE_DB_MODELS ? {} : "skip",
  ) as Doc<"models">[] | undefined;
}

// ============================================================================
// Static Helpers (server-safe, synchronous)
// ============================================================================

/**
 * Get all models from static config (synchronous, server-safe)
 * Use this for server-side code or as fallback
 */
export function getStaticModels(options?: {
  includeDeprecated?: boolean;
  includeInternalOnly?: boolean;
}): Record<string, ModelConfig> {
  return filterStaticModels(options);
}

/**
 * Get a single model from static config (synchronous, server-safe)
 */
export function getStaticModel(modelId: string): ModelConfig | undefined {
  if (modelId === "auto") return AUTO_MODEL;
  return MODEL_CONFIG[modelId];
}

/**
 * Check if DB models are enabled
 */
export function isDbModelsEnabled(): boolean {
  return USE_DB_MODELS;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function filterStaticModels(options?: {
  includeDeprecated?: boolean;
  includeInternalOnly?: boolean;
}): Record<string, ModelConfig> {
  const result: Record<string, ModelConfig> = { auto: AUTO_MODEL };

  for (const [id, config] of Object.entries(MODEL_CONFIG)) {
    // Skip auto (already added)
    if (id === "auto") continue;

    // Filter internal-only models
    if (!options?.includeInternalOnly && config.isInternalOnly) continue;

    // Note: static config doesn't have deprecated status,
    // so includeDeprecated has no effect on static models

    result[id] = config;
  }

  return result;
}

// ============================================================================
// Model Lookup Utilities
// ============================================================================

/**
 * Get model name for display
 * Handles fallback gracefully
 */
export function getModelName(modelId: string): string {
  const config = getStaticModel(modelId);
  return config?.name ?? modelId.split(":").pop() ?? modelId;
}

/**
 * Get model provider
 */
export function getModelProvider(modelId: string): string {
  const config = getStaticModel(modelId);
  return config?.provider ?? modelId.split(":")[0] ?? "unknown";
}

/**
 * Check if model exists
 */
export function modelExists(modelId: string): boolean {
  return modelId === "auto" || !!MODEL_CONFIG[modelId];
}

/**
 * Get all provider names
 */
export function getProviders(): string[] {
  const providers = new Set<string>();
  for (const config of Object.values(MODEL_CONFIG)) {
    if (config.provider !== "auto") {
      providers.add(config.provider);
    }
  }
  return Array.from(providers).sort();
}
