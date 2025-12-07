# Phase 5: Remove Static Config

**Estimated Time**: 2 days
**Prerequisites**: Phase 4 complete (100% traffic on DB)

## Context

**Problem**: Static config still exists, causing confusion. Feature flag no longer needed.

**Solution**: Delete `MODEL_CONFIG`, update all imports, remove fallback logic.

## Architecture Overview

```
BEFORE:
Repository → Feature Flag → DB or Static

AFTER:
Repository → DB only (no fallback)
```

## Implementation

### Step 1: Identify All Usages

**Find files using MODEL_CONFIG**:

```bash
grep -r "MODEL_CONFIG" src/
grep -r "from.*models" src/
grep -r "import.*models" src/
```

**Expected files** (~15 total):
- `src/components/chat/ModelSelector.tsx`
- `src/components/chat/ImageGenerateButton.tsx`
- `src/components/chat/ComparisonModelSelector.tsx`
- `src/lib/ai/pricing.ts`
- `convex/generation.ts`
- `convex/generation/image.ts`
- `convex/chat.ts`
- `convex/tokens/service.ts`
- `src/app/(main)/app/page.tsx`
- `src/app/(main)/chat/[conversationId]/page.tsx`
- `src/components/sidebar/app-sidebar.tsx`
- `src/components/settings/MaintenanceSettings.tsx`
- Others...

### Step 2: Update Imports

**Pattern**:

```typescript
// BEFORE
import { MODEL_CONFIG, getModelConfig } from "@/lib/ai/models";

// AFTER
import { getModelConfig } from "@/lib/models/repository";
import type { ModelConfig } from "@/lib/ai/models"; // Keep type import
```

**For each file**, replace:
1. Remove `MODEL_CONFIG` imports
2. Change `getModelConfig` import to repository
3. Keep `ModelConfig` type import (if needed)

### Step 3: Remove Static Config

**File**: `src/lib/ai/models.ts`

**Rename file** (keep for reference):

```bash
mv src/lib/ai/models.ts src/lib/ai/models.legacy.ts
```

**Create new minimal `models.ts`**:

```typescript
import type { ReasoningConfig } from "./reasoning/types";

// TypeScript type definitions only
// Models are now stored in Convex DB (see docs/models/)

export interface ModelConfig {
  id: string;
  provider:
    | "openai"
    | "anthropic"
    | "google"
    | "xai"
    | "perplexity"
    | "ollama"
    | "openrouter"
    | "groq";
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number;
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: (
    | "vision"
    | "function-calling"
    | "thinking"
    | "extended-thinking"
    | "image-generation"
  )[];
  isLocal?: boolean;
  actualModelId?: string;
  reasoning?: ReasoningConfig;
}

// For type compatibility with existing code
export function getModelsByProvider(): Record<string, ModelConfig[]> {
  console.warn("getModelsByProvider() is deprecated. Use repository.getAllModels() instead.");
  return {};
}

// DEPRECATED: Use repository functions instead
export { getModelConfig, getAllModels, getModelsByProvider as getModelsByProviderNew } from "@/lib/models/repository";
```

### Step 4: Remove Feature Flag Logic

**File**: `src/lib/models/repository.ts`

**Replace**:

```typescript
// BEFORE
const USE_DB_MODELS = process.env.NEXT_PUBLIC_USE_DB_MODELS === "true";

export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  if (USE_DB_MODELS) {
    try {
      const dbModel = await fetchQuery(api.models.queries.get, { id });
      if (dbModel) return dbToModelConfig(dbModel);
    } catch (error) {
      console.error(`Failed to fetch model ${id} from DB, falling back to static:`, error);
    }
  }
  // Fallback to static config
  return MODEL_CONFIG[id] || null;
}

// AFTER
export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  try {
    const dbModel = await fetchQuery(api.models.queries.get, { id });
    if (dbModel) {
      return dbToModelConfig(dbModel);
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch model ${id} from DB:`, error);
    throw error; // No fallback - fail loudly
  }
}
```

**Apply same pattern** to `getAllModels()` and `getModelsByProvider()`.

### Step 5: Remove Environment Variable

**File**: `.env.local`

**Delete line**:

```bash
# Remove this line:
NEXT_PUBLIC_USE_DB_MODELS=true
```

### Step 6: Update ModelSelector

**File**: `src/components/chat/ModelSelector.tsx`

**Replace**:

```typescript
// BEFORE
const [modelsByProvider, setModelsByProvider] = useState(
  getModelsByProvider(),
);

// AFTER
const [modelsByProvider, setModelsByProvider] = useState<Record<string, ModelConfig[]>>({});

useEffect(() => {
  async function loadModels() {
    const all = await getAllModels();
    const grouped = all.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, ModelConfig[]>);
    setModelsByProvider(grouped);
  }
  loadModels();
}, []);
```

### Step 7: Run TypeScript Check

```bash
bun run lint
```

**Expected**: No errors related to `MODEL_CONFIG`.

### Step 8: Test All Features

- [ ] Chat generation works (all models)
- [ ] Image generation works
- [ ] Model selector shows all models
- [ ] Comparison mode works
- [ ] Reasoning configs applied
- [ ] Cost calculations accurate

## Validation Checklist

- [ ] `models.legacy.ts` exists (reference only)
- [ ] New minimal `models.ts` exports types only
- [ ] All 15 files updated (imports changed)
- [ ] Repository has no fallback logic
- [ ] Feature flag removed from `.env.local`
- [ ] TypeScript compiles (`bun run lint`)
- [ ] All features tested and working

## Troubleshooting

**Error**: "getModelsByProvider is not a function"
- Fix: Import from repository, not models

**Error**: "MODEL_CONFIG is not defined"
- Fix: Remove import, use repository functions

**Error**: "Cannot read property 'input' of undefined"
- Fix: Handle null from `getModelConfig()` (model might not exist)

## Rollback

**If issues after cleanup**:

```bash
# 1. Restore static config
mv src/lib/ai/models.legacy.ts src/lib/ai/models.ts

# 2. Revert repository changes
git checkout src/lib/models/repository.ts

# 3. Add feature flag back
echo "NEXT_PUBLIC_USE_DB_MODELS=true" >> .env.local

# 4. Revert all file imports
git checkout src/
```

## Next Steps

**Phase 6** adds performance optimizations (caching, indexes, search, analytics).

---

**Phase 5 Complete!** ✅ Static config removed, DB is single source of truth. Move to **[phase-6-optimization.md](./phase-6-optimization.md)** next.
