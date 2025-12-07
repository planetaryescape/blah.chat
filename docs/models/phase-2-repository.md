# Phase 2: Repository Pattern + Dual Read

**Estimated Time**: 2 days
**Prerequisites**: Phase 1 complete (schema + seed)
**Files to Create**:
- `convex/models/queries.ts`
- `src/lib/models/repository.ts`
- `src/lib/models/transforms.ts`

## Context

**Problem**: Static config in `models.ts` still used everywhere. Need gradual migration path.

**Solution**: Repository pattern abstracts DB access. Dual-read (DB + static fallback) during migration. Feature flag controls rollout.

## Architecture Overview

```
Frontend/Backend Code
    ↓ calls getModelConfig(id)
Repository (repository.ts)
    ↓ checks feature flag
Feature Flag (NEXT_PUBLIC_USE_DB_MODELS)
    ↓ true: query DB, false: use static
Convex Queries (queries.ts)
    ↓ read from DB
DB Models Table
```

## Implementation

### Step 1: Create Convex Queries

**File**: `convex/models/queries.ts`

```typescript
import { v } from "convex/values";
import { query } from "../_generated/server";

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("deprecated"), v.literal("beta"))),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = ctx.db.query("models");

    if (args.status) {
      results = results.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.provider) {
      results = results.withIndex("by_provider", (q) => q.eq("provider", args.provider as any));
    }

    return await results.collect();
  },
});

export const byProvider = query({
  args: { provider: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider as any))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getHistory = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .order("desc") // Newest first
      .collect();
  },
});
```

### Step 2: Create Transform Functions

**File**: `src/lib/models/transforms.ts`

```typescript
import type { Doc } from "../../../convex/_generated/dataModel";
import type { ModelConfig } from "../ai/models";
import type { ReasoningConfig } from "../ai/reasoning/types";

export function dbToModelConfig(dbModel: Doc<"models">): ModelConfig {
  // Parse reasoning config from JSON
  const reasoning: ReasoningConfig | undefined = dbModel.reasoningConfig
    ? JSON.parse(dbModel.reasoningConfig)
    : undefined;

  // Convert booleans back to capabilities array
  const capabilities: ModelConfig["capabilities"] = [];
  if (dbModel.supportsVision) capabilities.push("vision");
  if (dbModel.supportsFunctionCalling) capabilities.push("function-calling");
  if (dbModel.supportsThinking) capabilities.push("thinking");
  if (dbModel.supportsExtendedThinking) capabilities.push("extended-thinking");
  if (dbModel.supportsImageGeneration) capabilities.push("image-generation");

  return {
    id: dbModel.id,
    provider: dbModel.provider as ModelConfig["provider"],
    name: dbModel.name,
    description: dbModel.description,
    contextWindow: dbModel.contextWindow,
    actualModelId: dbModel.actualModelId,
    isLocal: dbModel.isLocal,
    pricing: {
      input: dbModel.inputCostPerMillion,
      output: dbModel.outputCostPerMillion,
      cached: dbModel.cachedInputCostPerMillion,
      reasoning: dbModel.thinkingCostPerMillion,
    },
    capabilities,
    reasoning,
  };
}

export function modelConfigToDb(config: ModelConfig, userId: string) {
  return {
    id: config.id,
    provider: config.provider,
    name: config.name,
    description: config.description,
    contextWindow: config.contextWindow,
    actualModelId: config.actualModelId,
    isLocal: config.isLocal || false,

    // Pricing
    inputCostPerMillion: config.pricing.input,
    outputCostPerMillion: config.pricing.output,
    cachedInputCostPerMillion: config.pricing.cached,
    thinkingCostPerMillion: config.pricing.reasoning,

    // Capabilities
    supportsVision: config.capabilities.includes("vision"),
    supportsFunctionCalling: config.capabilities.includes("function-calling"),
    supportsThinking: config.capabilities.includes("thinking"),
    supportsExtendedThinking: config.capabilities.includes("extended-thinking"),
    supportsImageGeneration: config.capabilities.includes("image-generation"),

    // Reasoning
    reasoningType: config.reasoning?.type,
    reasoningConfig: config.reasoning ? JSON.stringify(config.reasoning) : undefined,

    // Status
    status: "active" as const,

    // Audit
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: userId as any,
    updatedBy: userId as any,
  };
}
```

### Step 3: Create Repository

**File**: `src/lib/models/repository.ts`

```typescript
import { api } from "../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { MODEL_CONFIG, type ModelConfig } from "../ai/models";
import { dbToModelConfig } from "./transforms";

const USE_DB_MODELS = process.env.NEXT_PUBLIC_USE_DB_MODELS === "true";

export async function getModelConfig(id: string): Promise<ModelConfig | null> {
  // Feature flag: use DB or static config
  if (USE_DB_MODELS) {
    try {
      const dbModel = await fetchQuery(api.models.queries.get, { id });
      if (dbModel) {
        return dbToModelConfig(dbModel);
      }
    } catch (error) {
      console.error(`Failed to fetch model ${id} from DB, falling back to static:`, error);
    }
  }

  // Fallback to static config
  return MODEL_CONFIG[id] || null;
}

export async function getAllModels(): Promise<ModelConfig[]> {
  if (USE_DB_MODELS) {
    try {
      const dbModels = await fetchQuery(api.models.queries.list, {});
      return dbModels.map(dbToModelConfig);
    } catch (error) {
      console.error("Failed to fetch models from DB, falling back to static:", error);
    }
  }

  // Fallback to static config
  return Object.values(MODEL_CONFIG);
}

export async function getModelsByProvider(provider: string): Promise<ModelConfig[]> {
  if (USE_DB_MODELS) {
    try {
      const dbModels = await fetchQuery(api.models.queries.byProvider, { provider });
      return dbModels.map(dbToModelConfig);
    } catch (error) {
      console.error(`Failed to fetch ${provider} models from DB, falling back to static:`, error);
    }
  }

  // Fallback to static config
  return Object.values(MODEL_CONFIG).filter((m) => m.provider === provider);
}
```

### Step 4: Add Environment Variable

**File**: `.env.local`

Add this line:

```bash
NEXT_PUBLIC_USE_DB_MODELS=false
```

**Important**: Set to `false` for now (Phase 4 will enable gradually).

### Step 5: Update `getModelConfig` Export

**File**: `src/lib/ai/models.ts`

Find the existing `getModelConfig` function and ADD a deprecation comment:

```typescript
// DEPRECATED: Use repository.getModelConfig instead (Phase 2+)
// This function will be removed in Phase 5
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIG[modelId];
}
```

**Note**: Don't remove it yet - Phase 5 will handle migration.

### Step 6: Test Repository

Create a test file to verify dual-read works:

**File**: `src/lib/models/test-repository.ts` (temporary, delete after testing)

```typescript
import { getModelConfig, getAllModels } from "./repository";

async function test() {
  console.log("Testing repository...");

  // Test single model
  const gpt4o = await getModelConfig("openai:gpt-4o");
  console.log("GPT-4o:", gpt4o?.name);

  // Test all models
  const all = await getAllModels();
  console.log(`Total models: ${all.length}`);

  // Verify structure
  if (gpt4o) {
    console.log("Pricing:", gpt4o.pricing);
    console.log("Capabilities:", gpt4o.capabilities);
    console.log("Reasoning:", gpt4o.reasoning?.type);
  }
}

test().catch(console.error);
```

Run test:

```bash
bun run src/lib/models/test-repository.ts
```

**Expected output**:
```
Testing repository...
GPT-4o: GPT-4o
Total models: 58
Pricing: { input: 2.5, output: 10, cached: 1.25 }
Capabilities: ['vision', 'function-calling']
Reasoning: undefined
```

Delete test file after verification:

```bash
rm src/lib/models/test-repository.ts
```

## Validation Checklist

- [ ] `convex/models/queries.ts` created
- [ ] `src/lib/models/transforms.ts` created
- [ ] `src/lib/models/repository.ts` created
- [ ] `.env.local` has `NEXT_PUBLIC_USE_DB_MODELS=false`
- [ ] Test script runs successfully
- [ ] Repository returns same data as static config
- [ ] Fallback works if DB query fails
- [ ] TypeScript compiles (`bun run lint`)

## What This Enables

**Gradual Migration Path**:

```bash
# Week 1-3 (Phases 1-3): Build infrastructure
NEXT_PUBLIC_USE_DB_MODELS=false  # Still using static

# Week 4 (Phase 4): Gradual rollout
NEXT_PUBLIC_USE_DB_MODELS=true   # Switch to DB

# Week 5 (Phase 5): Remove static
# Delete MODEL_CONFIG entirely
```

**Safe Rollback**:

```bash
# If DB has issues in production:
NEXT_PUBLIC_USE_DB_MODELS=false  # Instant fallback to static
```

## Troubleshooting

**Error: "Cannot find module 'convex/nextjs'"**
- Fix: `bun add convex` if not installed

**Error: "fetchQuery is not a function"**
- Fix: Import from `convex/nextjs`, not `convex/react`

**Repository returns null for all models**
- Check: Feature flag is `false` (expected until Phase 4)
- Check: Static `MODEL_CONFIG` still has data

**DB query hangs forever**
- Check: Convex dev server running (`npx convex dev`)
- Check: `NEXT_PUBLIC_CONVEX_URL` in `.env.local`

## Rollback

```bash
# Delete created files
rm -rf src/lib/models
rm convex/models/queries.ts

# Remove env var
# Delete NEXT_PUBLIC_USE_DB_MODELS from .env.local

# Revert deprecation comment
git checkout src/lib/ai/models.ts
```

## Next Steps

**Phase 3** creates admin UI to CRUD models in the DB.
**Phase 4** enables feature flag gradually (1% → 100%).
**Phase 5** removes static config entirely.

---

**Phase 2 Complete!** ✅ Repository pattern ready, dual-read working. Move to **[phase-3-admin-ui.md](./phase-3-admin-ui.md)** next.
