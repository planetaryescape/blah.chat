/**
 * Model Registry
 *
 * Abstraction over model configs, profiles, and route bins.
 * Allows external consumers to bring their own models while
 * still using the built-in defaults as a starting point.
 */

import { ROUTE_BINS } from "./bins";
import {
  MODEL_CONFIG,
  MODEL_PROFILES,
  type ModelConfigForRouter,
  type ModelProfile,
} from "./profiles";
import type { ModelBin, RouteLabel } from "./types";

export interface ModelRegistry {
  models: Record<string, ModelConfigForRouter>;
  profiles: Record<string, ModelProfile>;
  bins: Record<RouteLabel, ModelBin>;
}

export const DEFAULT_REGISTRY: ModelRegistry = {
  models: MODEL_CONFIG,
  profiles: MODEL_PROFILES,
  bins: ROUTE_BINS,
};

export interface RegistryOverrides {
  models?: Record<string, ModelConfigForRouter>;
  profiles?: Record<string, ModelProfile>;
  bins?: Record<string, ModelBin>;
}

/** Create a registry, optionally overriding defaults. When provided, overrides replace entirely (no merging). */
export function createRegistry(overrides?: RegistryOverrides): ModelRegistry {
  if (!overrides) return { ...DEFAULT_REGISTRY };

  return {
    models: overrides.models ?? DEFAULT_REGISTRY.models,
    profiles: overrides.profiles ?? DEFAULT_REGISTRY.profiles,
    bins:
      (overrides.bins as Record<RouteLabel, ModelBin>) ?? DEFAULT_REGISTRY.bins,
  };
}

export interface RegistryWarning {
  type: "orphaned_model_in_bin";
  bin: string;
  modelId: string;
  message: string;
}

/** Validate a registry, stripping bin entries that reference non-existent model IDs. Returns the cleaned registry + warnings. */
export function validateRegistry(registry: ModelRegistry): {
  registry: ModelRegistry;
  warnings: RegistryWarning[];
} {
  const warnings: RegistryWarning[] = [];
  const cleanedBins: Record<string, ModelBin> = {};

  for (const [label, bin] of Object.entries(registry.bins)) {
    const validPrimary = bin.primary.filter((id) => {
      if (registry.models[id]) return true;
      warnings.push({
        type: "orphaned_model_in_bin",
        bin: label,
        modelId: id,
        message: `Model "${id}" in bin "${label}" primary list not found in registry`,
      });
      return false;
    });

    const validFallbacks = bin.fallbacks.filter((id) => {
      if (registry.models[id]) return true;
      warnings.push({
        type: "orphaned_model_in_bin",
        bin: label,
        modelId: id,
        message: `Model "${id}" in bin "${label}" fallbacks list not found in registry`,
      });
      return false;
    });

    cleanedBins[label] = {
      ...bin,
      primary: validPrimary,
      fallbacks: validFallbacks,
    };
  }

  return {
    registry: {
      ...registry,
      bins: cleanedBins as Record<RouteLabel, ModelBin>,
    },
    warnings,
  };
}
