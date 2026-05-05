/**
 * Model Repository
 *
 * Abstraction layer for model configuration.
 * Uses static MODEL_CONFIG from @blah-chat/ai/models.
 *
 * Usage:
 * - In React components: use useModels(), useModel(id) hooks
 * - In server code: use getStaticModels() for fallback
 */

import {
  AUTO_MODEL,
  MODEL_CONFIG,
  type ModelConfig,
} from "@blah-chat/ai/models";
import type { AutoRouterConfigValue } from "@blah-chat/persistence-postgres";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// React Hooks (client-side, reactive)
// ============================================================================

/**
 * Hook to get all available models from static config
 *
 * @param options.includeDeprecated - Include deprecated models
 * @param options.includeInternalOnly - Include internal-only models (admin)
 * @returns Record of model IDs to ModelConfig
 */
export function useModels(options?: {
  includeDeprecated?: boolean;
  includeInternalOnly?: boolean;
}): Record<string, ModelConfig> | undefined {
  return filterStaticModels(options);
}

/**
 * Hook to get a single model by ID from static config
 *
 * @param modelId - Model ID (e.g., "openai:gpt-5")
 * @returns ModelConfig or undefined
 */
export function useModel(modelId: string | undefined): ModelConfig | undefined {
  if (!modelId) return undefined;
  if (modelId === "auto") return AUTO_MODEL;
  return MODEL_CONFIG[modelId];
}

/**
 * Hook to get model profiles for auto-router
 * TODO: Phase 15 - need REST route for model profiles
 */
export function useModelProfiles(): undefined {
  return undefined;
}

/**
 * Hook to read the global auto-router configuration. Admin-only — endpoint
 * returns 403 for non-admins, in which case the hook resolves to `undefined`
 * and consumers fall back to defaults baked into the runtime.
 */
export function useRouterConfig(): AutoRouterConfigValue | undefined {
  const { data } = useQuery({
    queryKey: ["admin", "auto-router-config"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/auto-router/config");
      if (!res.ok) return undefined;
      const json = await res.json();
      return json.data as AutoRouterConfigValue | undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

/**
 * Hook to get model history
 * TODO: Phase 15 - need REST route for model history
 */
export function useModelHistory(
  _modelId: string | undefined,
  _limit?: number,
): undefined {
  return undefined;
}

/**
 * Hook to get model stats (for admin)
 * TODO: Phase 15 - need REST route for model stats
 */
export function useModelStats():
  | {
      total: number;
      byStatus: { active: number; deprecated: number; beta: number };
      byProvider: Record<string, number>;
    }
  | undefined {
  return undefined;
}

/**
 * Hook to get all models including internal (for admin)
 * TODO: Phase 15 - need REST route for admin model list
 */
export function useAllModels(): any {
  return undefined;
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
