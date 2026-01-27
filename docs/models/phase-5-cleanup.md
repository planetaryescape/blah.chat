# Phase 5: Remove Static Config

**Status**: ✅ COMPLETE - Feature flag `NEXT_PUBLIC_USE_DB_MODELS` removed
**Estimated Time**: 2 days
**Prerequisites**: Phase 4 complete (100% traffic on DB for 72+ hours)
**Note**: The feature flag has been removed. DB-backed models are now the default with static fallback during loading only.

## What This Phase Does

Removes the static `MODEL_CONFIG` object from codebase. Updates all imports to use repository functions. Removes feature flag logic. DB becomes the single source of truth.

## Why This Is Needed

- Static config creates confusion (two sources of truth)
- Feature flag logic adds complexity
- Keeping dead code is a maintenance burden
- Clean codebase for future development

## Architecture Change

```
BEFORE:
Repository → Feature Flag → DB or Static
                          ↓
                    (fallback path)

AFTER:
Repository → DB only (no fallback)
```

## Files to Modify

Based on codebase scan (~37 files use MODEL_CONFIG):

### High Priority (core functionality)

| File | Changes Needed |
|------|----------------|
| `apps/web/src/lib/ai/models.ts` | Remove MODEL_CONFIG, keep types only |
| `apps/web/src/lib/models/repository.ts` | Remove fallback, remove feature flag |
| `packages/ai/src/models.ts` | Remove shared MODEL_CONFIG, keep types |
| `packages/backend/convex/generation.ts` | Use repository imports |
| `packages/backend/convex/ai/autoRouter.ts` | Use repository imports |
| `apps/web/src/lib/ai/pricing.ts` | Use repository for model lookup |

### UI Components

| File | Changes Needed |
|------|----------------|
| `apps/web/src/components/chat/ModelSelector.tsx` | Use repository |
| `apps/web/src/components/chat/QuickModelSwitcher.tsx` | Use repository |
| `apps/web/src/components/chat/ModelDetailCard.tsx` | Use repository |
| `apps/web/src/components/chat/ComparisonModelSelector.tsx` | Use repository |
| `apps/web/src/components/chat/ImageGenerateButton.tsx` | Use repository |

### Backend

| File | Changes Needed |
|------|----------------|
| `packages/backend/convex/chat.ts` | Use repository |
| `packages/backend/convex/tokens/service.ts` | Use repository |
| `packages/backend/convex/generation/image.ts` | Use repository |
| `packages/backend/convex/ai/modelProfiles.ts` | Use DB profiles |

### API Routes

| File | Changes Needed |
|------|----------------|
| `apps/web/src/app/api/v1/models/route.ts` | Use repository |
| `apps/web/src/app/api/v1/chat/route.ts` | Use repository |

## Implementation

### Step 1: Update Repository (Remove Fallback)

**File**: `apps/web/src/lib/models/repository.ts`

**Replace**:
```typescript
// BEFORE - with fallback
const USE_DB_MODELS = process.env.NEXT_PUBLIC_USE_DB_MODELS === "true";

export function useModelConfig(id: string): ModelConfig | undefined {
  if (id === "auto") return AUTO_MODEL as ModelConfig;

  const dbModel = useQuery(
    api.models.queries.getById,
    USE_DB_MODELS ? { id } : "skip"
  );

  if (USE_DB_MODELS && dbModel) {
    return dbToModelConfig(dbModel);
  }

  // Fallback to static
  return STATIC_MODEL_CONFIG[id];
}

// AFTER - DB only
export function useModelConfig(id: string): ModelConfig | undefined {
  if (id === "auto") return AUTO_MODEL as ModelConfig;

  const dbModel = useQuery(api.models.queries.getById, { id });

  if (!dbModel) return undefined;
  return dbToModelConfig(dbModel);
}
```

**Apply same pattern** to:
- `useAllModels()`
- `useModelsByProvider()`
- `useMobileModels()`
- `getModelConfig()` (async version)
- `getAllModels()` (async version)

### Step 2: Create Minimal Types File

**File**: `apps/web/src/lib/ai/models.ts`

**Rename existing to backup** (optional, for reference):
```bash
mv apps/web/src/lib/ai/models.ts apps/web/src/lib/ai/models.legacy.ts
```

**Create new minimal file**:
```typescript
/**
 * Model types and interfaces
 *
 * IMPORTANT: Model data is now stored in Convex DB.
 * Use repository functions for model access:
 * - import { useModelConfig, useAllModels } from "@/lib/models/repository"
 *
 * This file only contains TypeScript types and the AUTO_MODEL constant.
 */

import type { ReasoningConfig } from "./reasoning/types";

// ============================================================
// Types
// ============================================================

export type Provider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "perplexity"
  | "groq"
  | "cerebras"
  | "minimax"
  | "deepseek"
  | "kimi"
  | "zai"
  | "meta"
  | "mistral"
  | "alibaba"
  | "zhipu"
  | "ollama"
  | "openrouter";

export type SpeedTier = "instant" | "fast" | "moderate" | "slow" | "deliberate";

export type Capability =
  | "vision"
  | "function-calling"
  | "thinking"
  | "extended-thinking"
  | "image-generation";

export interface ModelPricing {
  input: number;  // $ per 1M tokens
  output: number; // $ per 1M tokens
  cached?: number;
  reasoning?: number;
}

export interface ModelConfig {
  id: string;
  provider: Provider;
  name: string;
  description?: string;
  contextWindow: number;
  pricing: ModelPricing;
  capabilities: Capability[];
  isLocal?: boolean;
  actualModelId?: string;
  reasoning?: ReasoningConfig;

  // Extended fields
  gateway?: "vercel" | "openrouter";
  hostOrder?: string[];
  knowledgeCutoff?: string;
  userFriendlyDescription?: string;
  bestFor?: string;
  benchmarks?: Record<string, number>;
  speedTier?: SpeedTier;
  isPro?: boolean;
  isInternalOnly?: boolean;
  isExperimental?: boolean;
}

// ============================================================
// AUTO_MODEL (special case - not stored in DB)
// ============================================================

/**
 * AUTO_MODEL is a meta-model that routes to real models.
 * It's not stored in the DB because:
 * 1. It's not a real model - it routes to other models
 * 2. Its "configuration" IS the auto-router config (see /admin/auto-router)
 * 3. It doesn't have pricing (depends on selected model)
 */
export const AUTO_MODEL = {
  id: "auto",
  provider: "auto" as const,
  name: "Auto",
  description: "Automatically selects the best model for your task",
  contextWindow: 200000, // Maximum across all models
  pricing: { input: 0, output: 0 }, // Calculated from selected model
  capabilities: ["vision", "function-calling"] as Capability[],
  userFriendlyDescription: "Let blah.chat pick the best model for each message",
  bestFor: "Mixed conversations, unknown requirements",
};

// ============================================================
// Deprecated Exports (for migration compatibility)
// ============================================================

/**
 * @deprecated Use repository functions instead:
 * import { useAllModels } from "@/lib/models/repository"
 */
export function getModelsByProvider(): Record<string, ModelConfig[]> {
  console.warn(
    "getModelsByProvider() is deprecated. Use useModelsByProvider() from repository."
  );
  return {};
}

/**
 * @deprecated Use repository functions instead:
 * import { useModelConfig } from "@/lib/models/repository"
 */
export function getModelConfig(id: string): ModelConfig | undefined {
  console.warn(
    "getModelConfig() from models.ts is deprecated. Use useModelConfig() from repository."
  );
  return undefined;
}
```

### Step 3: Update Shared Package Types

**File**: `packages/ai/src/models.ts`

Same pattern - keep types, remove static data:
```typescript
/**
 * Shared model types for web and mobile
 *
 * Model data is stored in Convex DB, accessed via repository.
 */

// Re-export types from web (or duplicate if needed for mobile)
export type {
  Provider,
  SpeedTier,
  Capability,
  ModelPricing,
  ModelConfig,
} from "../../apps/web/src/lib/ai/models"; // Adjust path based on monorepo setup

// OR duplicate types here if cross-package imports are problematic
```

### Step 4: Update All Import Statements

**Pattern for each file**:

```typescript
// BEFORE
import { MODEL_CONFIG, getModelConfig } from "@/lib/ai/models";

const model = MODEL_CONFIG[modelId];
const config = getModelConfig(modelId);

// AFTER
import { useModelConfig, useAllModels } from "@/lib/models/repository";
import type { ModelConfig } from "@/lib/ai/models";

// In React components:
const model = useModelConfig(modelId);

// In async functions (Convex actions, API routes):
const model = await getModelConfigAsync(modelId);
```

### Step 5: Remove Environment Variable

**Files to update**:
- `.env.local` - remove `NEXT_PUBLIC_USE_DB_MODELS`
- `.env.example` - remove `NEXT_PUBLIC_USE_DB_MODELS`
- Vercel dashboard - remove the variable

### Step 6: Run TypeScript Check

```bash
bun run lint
```

**Expected**: No errors related to `MODEL_CONFIG` or missing imports.

### Step 7: Test All Features

Manual verification:

- [ ] Chat generation works (try multiple models)
- [ ] Model selector loads and shows all models
- [ ] Comparison mode works
- [ ] Image generation works
- [ ] Reasoning/thinking models configured correctly
- [ ] Cost calculations accurate
- [ ] Admin UI still works
- [ ] Mobile API returns correct models

## Validation Checklist

- [ ] `models.legacy.ts` exists (optional backup)
- [ ] New minimal `models.ts` exports types only
- [ ] `MODEL_CONFIG` not referenced anywhere (grep returns nothing)
- [ ] Repository has no fallback logic
- [ ] Feature flag removed from env
- [ ] TypeScript compiles (`bun run lint`)
- [ ] All features tested and working

## Troubleshooting

### Error: "MODEL_CONFIG is not defined"

**Problem**: Some file still imports the old object.

**Fix**:
```bash
grep -r "MODEL_CONFIG" apps/ packages/
```
Update each file to use repository.

### Error: "getModelsByProvider is not a function"

**Problem**: Old import still used.

**Fix**: Import from repository:
```typescript
import { useModelsByProvider } from "@/lib/models/repository";
```

### Error: "Cannot read property 'input' of undefined"

**Problem**: Model not found in DB.

**Fix**:
1. Check model exists in Convex dashboard
2. Ensure model status is "active"
3. Handle null case in code

### Error: "useQuery called outside React"

**Problem**: Trying to use React hook in non-component code.

**Fix**: Use async version for server-side:
```typescript
// In Convex action or API route:
import { getModelConfigAsync } from "@/lib/models/repository";

const model = await getModelConfigAsync(modelId);
```

## Rollback

**If issues after cleanup**:

```bash
# 1. Restore static config (if backup kept)
mv apps/web/src/lib/ai/models.legacy.ts apps/web/src/lib/ai/models.ts

# 2. Re-add feature flag
echo "NEXT_PUBLIC_USE_DB_MODELS=true" >> .env.local

# 3. Revert repository to dual-read mode
git checkout apps/web/src/lib/models/repository.ts

# 4. Revert all file imports
git checkout apps/ packages/
```

**Note**: Rollback is now more complex since static config is removed. Keep backup for 2 weeks before deleting.

## What Comes Next

**Phase 6** adds performance optimizations:
- Search query for models
- Usage analytics tracking
- Additional indexes if needed
- Performance benchmarks

---

**Phase 5 Complete!** Static config removed, DB is single source of truth. Proceed to **[phase-6-optimization.md](./phase-6-optimization.md)**.
