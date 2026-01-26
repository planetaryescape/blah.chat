# Phase 2: Repository Layer & Feature Flag

**Estimated Time**: 2 days
**Prerequisites**: Phase 1 (Schema + Seed) complete
**Depends On**: Phase 1
**Blocks**: Phase 3 (Admin UI), Phase 4 (Rollout), Phase 5 (Cleanup)

## Context

### What We're Building
This phase creates the abstraction layer between the application and model data. The repository pattern allows us to:
1. Switch between DB and static config via feature flag
2. Transform DB records to/from the existing `ModelConfig` type
3. Maintain backward compatibility with existing code
4. Enable gradual rollout without breaking changes

### Why We're Doing This
The application currently imports `MODEL_CONFIG` directly from `@/lib/ai/models`. We need a layer that:
- Returns the same `ModelConfig` type whether data comes from DB or static file
- Can fall back to static config if DB query fails
- Supports the feature flag for gradual rollout
- Works with Convex reactive queries for automatic cache invalidation

### What Comes Before
- **Phase 1** created the database tables and seeded them with data

### What Comes After
- **Phase 3** creates admin UI that calls these repository functions
- **Phase 4** uses the feature flag for gradual rollout
- **Phase 5** removes static config and relies fully on repository

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/models/queries.ts` | Create | Convex queries for reading models |
| `packages/backend/convex/models/mutations.ts` | Create | Convex mutations for CRUD + history |
| `apps/web/src/lib/models/repository.ts` | Create | Client-side repository with feature flag |
| `apps/web/src/lib/models/transforms.ts` | Create | DB ↔ ModelConfig transformations |
| `apps/web/src/lib/models/index.ts` | Create | Package exports |
| `.env.local` | Modify | Add feature flag |

## Implementation

### Step 1: Create Convex Queries

**File**: `packages/backend/convex/models/queries.ts`

```typescript
/**
 * Convex queries for reading model data
 * These are reactive - clients auto-update when data changes
 */
import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get a single model by its string ID (e.g., "openai:gpt-5")
 */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const model = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    return model;
  },
});

/**
 * Get all models, optionally filtered by status and/or provider
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("deprecated"), v.literal("beta"))
    ),
    provider: v.optional(v.string()),
    includeInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("models");

    // Filter by status if provided
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status!));
    }

    let models = await query.collect();

    // Filter by provider if provided
    if (args.provider) {
      models = models.filter((m) => m.provider === args.provider);
    }

    // Exclude internal models unless explicitly requested
    if (!args.includeInternal) {
      models = models.filter((m) => !m.isInternalOnly);
    }

    return models;
  },
});

/**
 * Get models grouped by provider (for model picker UI)
 */
export const byProvider = query({
  args: {
    includeInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let models = await ctx.db.query("models").collect();

    // Filter to active only
    models = models.filter((m) => m.status === "active");

    // Exclude internal unless requested
    if (!args.includeInternal) {
      models = models.filter((m) => !m.isInternalOnly);
    }

    // Group by provider
    const byProvider: Record<string, typeof models> = {};
    for (const model of models) {
      if (!byProvider[model.provider]) {
        byProvider[model.provider] = [];
      }
      byProvider[model.provider].push(model);
    }

    return byProvider;
  },
});

/**
 * Search models by name, description, or ID
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();
    const models = await ctx.db.query("models").collect();

    return models.filter(
      (m) =>
        m.status === "active" &&
        (m.id.toLowerCase().includes(searchTerm) ||
          m.name.toLowerCase().includes(searchTerm) ||
          m.description?.toLowerCase().includes(searchTerm) ||
          m.userFriendlyDescription?.toLowerCase().includes(searchTerm))
    );
  },
});

/**
 * Get version history for a specific model
 */
export const getHistory = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .order("desc")
      .collect();

    return history;
  },
});

/**
 * Get auto-router configuration (singleton)
 */
export const getAutoRouterConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("autoRouterConfig").first();
    return config;
  },
});

/**
 * Get model profile (category scores) for a specific model
 */
export const getModelProfile = query({
  args: { modelId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("modelProfiles")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();

    return profile;
  },
});

/**
 * Get all model profiles
 */
export const getAllModelProfiles = query({
  handler: async (ctx) => {
    return await ctx.db.query("modelProfiles").collect();
  },
});
```

### Step 2: Create Convex Mutations

**File**: `packages/backend/convex/models/mutations.ts`

```typescript
/**
 * Convex mutations for model CRUD operations
 * All mutations track history for audit trail
 */
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../users/utils";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("deprecated"),
  v.literal("beta")
);

/**
 * Create a new model
 */
export const create = mutation({
  args: {
    id: v.string(),
    provider: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    contextWindow: v.number(),
    inputCost: v.number(),
    outputCost: v.number(),
    cachedInputCost: v.optional(v.number()),
    reasoningCost: v.optional(v.number()),
    supportsVision: v.boolean(),
    supportsFunctionCalling: v.boolean(),
    supportsThinking: v.boolean(),
    supportsExtendedThinking: v.boolean(),
    supportsImageGeneration: v.boolean(),
    reasoningConfig: v.optional(v.string()),
    gateway: v.optional(v.string()),
    hostOrder: v.optional(v.array(v.string())),
    knowledgeCutoff: v.optional(v.string()),
    userFriendlyDescription: v.optional(v.string()),
    bestFor: v.optional(v.string()),
    benchmarks: v.optional(v.string()),
    speedTier: v.optional(v.string()),
    isPro: v.optional(v.boolean()),
    isInternalOnly: v.optional(v.boolean()),
    isExperimental: v.optional(v.boolean()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    // Auth check
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Check for duplicate ID
    const existing = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      throw new Error(`Model with ID "${args.id}" already exists`);
    }

    // Insert model
    const modelId = await ctx.db.insert("models", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
      updatedBy: user._id,
    } as any);

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: 1,
      changeType: "created",
      changes: [],
      changedBy: user._id,
      changedAt: Date.now(),
      reason: "Model created via admin UI",
    });

    return modelId;
  },
});

/**
 * Update an existing model
 */
export const update = mutation({
  args: {
    id: v.string(),
    updates: v.any(), // Flexible updates object
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const model = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (!model) {
      throw new Error(`Model "${args.id}" not found`);
    }

    // Calculate changes for history
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const [key, newValue] of Object.entries(args.updates)) {
      if (newValue !== undefined) {
        const oldValue = (model as any)[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ field: key, oldValue, newValue });
        }
      }
    }

    if (changes.length === 0) {
      return model._id;
    }

    // Get next version number
    const lastHistory = await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.id))
      .order("desc")
      .first();
    const nextVersion = (lastHistory?.version ?? 0) + 1;

    // Update model
    await ctx.db.patch(model._id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: nextVersion,
      changeType: "updated",
      changes,
      changedBy: user._id,
      changedAt: Date.now(),
      reason: args.reason,
    });

    return model._id;
  },
});

/**
 * Soft delete (deprecate) a model
 */
export const deprecate = mutation({
  args: {
    id: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const model = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (!model) {
      throw new Error(`Model "${args.id}" not found`);
    }

    const lastHistory = await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.id))
      .order("desc")
      .first();
    const nextVersion = (lastHistory?.version ?? 0) + 1;

    await ctx.db.patch(model._id, {
      status: "deprecated",
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: nextVersion,
      changeType: "deprecated",
      changes: [{ field: "status", oldValue: model.status, newValue: "deprecated" }],
      changedBy: user._id,
      changedAt: Date.now(),
      reason: args.reason ?? "Model deprecated via admin UI",
    });

    return model._id;
  },
});

/**
 * Duplicate a model with a new ID
 */
export const duplicate = mutation({
  args: {
    sourceId: v.string(),
    newId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const source = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.sourceId))
      .first();

    if (!source) {
      throw new Error(`Source model "${args.sourceId}" not found`);
    }

    const existing = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.newId))
      .first();

    if (existing) {
      throw new Error(`Model with ID "${args.newId}" already exists`);
    }

    const { _id, _creationTime, createdAt, updatedAt, createdBy, updatedBy, ...sourceData } = source;

    const modelId = await ctx.db.insert("models", {
      ...sourceData,
      id: args.newId,
      name: args.newName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
      updatedBy: user._id,
    });

    await ctx.db.insert("modelHistory", {
      modelId: args.newId,
      version: 1,
      changeType: "created",
      changes: [],
      changedBy: user._id,
      changedAt: Date.now(),
      reason: `Duplicated from ${args.sourceId}`,
    });

    return modelId;
  },
});

/**
 * Update auto-router configuration
 */
export const updateAutoRouterConfig = mutation({
  args: {
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const config = await ctx.db.query("autoRouterConfig").first();
    if (!config) {
      throw new Error("Auto-router config not found. Run seed first.");
    }

    await ctx.db.patch(config._id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return config._id;
  },
});

/**
 * Update model profile (category scores)
 */
export const updateModelProfile = mutation({
  args: {
    modelId: v.string(),
    qualityScore: v.optional(v.number()),
    categoryScores: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const profile = await ctx.db
      .query("modelProfiles")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        ...(args.qualityScore !== undefined && { qualityScore: args.qualityScore }),
        ...(args.categoryScores !== undefined && { categoryScores: args.categoryScores }),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
      return profile._id;
    } else {
      return await ctx.db.insert("modelProfiles", {
        modelId: args.modelId,
        qualityScore: args.qualityScore ?? 50,
        categoryScores: args.categoryScores ?? JSON.stringify({
          coding: 50, reasoning: 50, creative: 50, factual: 50,
          analysis: 50, conversation: 50, multimodal: 50, research: 50,
        }),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }
  },
});
```

### Step 3: Create Transform Functions

**File**: `apps/web/src/lib/models/transforms.ts`

```typescript
/**
 * Transform functions between DB records and ModelConfig types
 */
import type { ModelConfig } from "@/lib/ai/models";
import type { Doc } from "@blah/backend/convex/_generated/dataModel";

type DbModel = Doc<"models">;

export function dbToModelConfig(db: DbModel): ModelConfig {
  const capabilities: ModelConfig["capabilities"] = [];
  if (db.supportsVision) capabilities.push("vision");
  if (db.supportsFunctionCalling) capabilities.push("function-calling");
  if (db.supportsThinking) capabilities.push("thinking");
  if (db.supportsExtendedThinking) capabilities.push("extended-thinking");
  if (db.supportsImageGeneration) capabilities.push("image-generation");

  const reasoning = db.reasoningConfig ? JSON.parse(db.reasoningConfig) : undefined;
  const benchmarks = db.benchmarks ? JSON.parse(db.benchmarks) : undefined;

  return {
    id: db.id,
    provider: db.provider as ModelConfig["provider"],
    name: db.name,
    description: db.description,
    contextWindow: db.contextWindow,
    pricing: {
      input: db.inputCost,
      output: db.outputCost,
      cached: db.cachedInputCost,
      reasoning: db.reasoningCost,
    },
    capabilities,
    isLocal: db.isLocal,
    actualModelId: db.actualModelId,
    reasoning,
    hostOrder: db.hostOrder,
    isExperimental: db.isExperimental,
    knowledgeCutoff: db.knowledgeCutoff,
    gateway: db.gateway as ModelConfig["gateway"],
    userFriendlyDescription: db.userFriendlyDescription,
    bestFor: db.bestFor,
    benchmarks,
    speedTier: db.speedTier as ModelConfig["speedTier"],
    isPro: db.isPro,
    isInternalOnly: db.isInternalOnly,
  };
}

export function modelConfigToDb(config: ModelConfig): Partial<DbModel> {
  return {
    id: config.id,
    provider: config.provider as any,
    name: config.name,
    description: config.description,
    contextWindow: config.contextWindow,
    actualModelId: config.actualModelId,
    isLocal: config.isLocal,
    inputCost: config.pricing.input,
    outputCost: config.pricing.output,
    cachedInputCost: config.pricing.cached,
    reasoningCost: config.pricing.reasoning,
    supportsVision: config.capabilities?.includes("vision") ?? false,
    supportsFunctionCalling: config.capabilities?.includes("function-calling") ?? false,
    supportsThinking: config.capabilities?.includes("thinking") ?? false,
    supportsExtendedThinking: config.capabilities?.includes("extended-thinking") ?? false,
    supportsImageGeneration: config.capabilities?.includes("image-generation") ?? false,
    reasoningConfig: config.reasoning ? JSON.stringify(config.reasoning) : undefined,
    gateway: config.gateway,
    hostOrder: config.hostOrder,
    knowledgeCutoff: config.knowledgeCutoff,
    userFriendlyDescription: config.userFriendlyDescription,
    bestFor: config.bestFor,
    benchmarks: config.benchmarks ? JSON.stringify(config.benchmarks) : undefined,
    speedTier: config.speedTier,
    isPro: config.isPro,
    isInternalOnly: config.isInternalOnly,
    isExperimental: config.isExperimental,
    status: "active",
  };
}
```

### Step 4: Create Repository

**File**: `apps/web/src/lib/models/repository.ts`

```typescript
/**
 * Model Repository - abstraction layer for model data access
 */
import { useQuery } from "convex/react";
import { api } from "@blah/backend/convex/_generated/api";
import {
  MODEL_CONFIG as STATIC_MODEL_CONFIG,
  AUTO_MODEL,
  type ModelConfig,
} from "@/lib/ai/models";
import { dbToModelConfig } from "./transforms";

const USE_DB_MODELS = process.env.NEXT_PUBLIC_USE_DB_MODELS === "true";

/**
 * Hook to get a single model by ID
 */
export function useModelConfig(id: string): ModelConfig | undefined {
  if (id === "auto") {
    return AUTO_MODEL as ModelConfig;
  }

  const dbModel = useQuery(
    api.models.queries.getById,
    USE_DB_MODELS ? { id } : "skip"
  );

  if (USE_DB_MODELS && dbModel) {
    return dbToModelConfig(dbModel);
  }

  return STATIC_MODEL_CONFIG[id];
}

/**
 * Hook to get all models grouped by provider
 */
export function useModelsByProvider(): Record<string, ModelConfig[]> {
  const dbModels = useQuery(
    api.models.queries.byProvider,
    USE_DB_MODELS ? {} : "skip"
  );

  if (USE_DB_MODELS && dbModels) {
    const result: Record<string, ModelConfig[]> = {};
    for (const [provider, models] of Object.entries(dbModels)) {
      result[provider] = models.map(dbToModelConfig);
    }
    return result;
  }

  const result: Record<string, ModelConfig[]> = {};
  for (const model of Object.values(STATIC_MODEL_CONFIG)) {
    if (model.id === "auto" || model.isInternalOnly) continue;
    if (!result[model.provider]) {
      result[model.provider] = [];
    }
    result[model.provider].push(model);
  }
  return result;
}

/**
 * Hook to get all active models
 */
export function useAllModels(): ModelConfig[] {
  const dbModels = useQuery(
    api.models.queries.list,
    USE_DB_MODELS ? { status: "active" } : "skip"
  );

  if (USE_DB_MODELS && dbModels) {
    return dbModels.map(dbToModelConfig);
  }

  return Object.values(STATIC_MODEL_CONFIG).filter(
    (m) => m.id !== "auto" && !m.isInternalOnly
  );
}

/**
 * Sync function for server-side contexts
 */
export function getModelConfigSync(id: string): ModelConfig | undefined {
  if (id === "auto") {
    return AUTO_MODEL as ModelConfig;
  }
  return STATIC_MODEL_CONFIG[id];
}

export function isDbModelsEnabled(): boolean {
  return USE_DB_MODELS;
}
```

### Step 5: Create Package Index

**File**: `apps/web/src/lib/models/index.ts`

```typescript
export {
  useModelConfig,
  useModelsByProvider,
  useAllModels,
  getModelConfigSync,
  isDbModelsEnabled,
} from "./repository";

export { dbToModelConfig, modelConfigToDb } from "./transforms";

export type { ModelConfig } from "@/lib/ai/models";
```

### Step 6: Add Feature Flag

**File**: `.env.local`

```bash
# Model Management Feature Flags
NEXT_PUBLIC_USE_DB_MODELS=false
NEXT_PUBLIC_USE_DB_ROUTER_CONFIG=false
```

## Validation Checklist

- [ ] `packages/backend/convex/models/queries.ts` created
- [ ] `packages/backend/convex/models/mutations.ts` created
- [ ] `apps/web/src/lib/models/transforms.ts` created
- [ ] `apps/web/src/lib/models/repository.ts` created
- [ ] `apps/web/src/lib/models/index.ts` created
- [ ] `.env.local` has feature flags set to `false`
- [ ] Convex dev server runs without errors
- [ ] `useModelConfig("openai:gpt-5")` returns correct data
- [ ] Feature flag `false` → uses static config
- [ ] TypeScript compiles (`bun run lint`)

## Troubleshooting

**Error: "api.models.queries is undefined"**
- Run `bunx convex dev` to regenerate types

**useQuery returns undefined**
- Expected when feature flag is `false` (skipped)
- Repository falls back to static config

**Type errors in transforms**
- Ensure schema field names match (inputCost vs inputCostPerMillion)

## Rollback

```bash
# Set feature flag to false (immediate)
NEXT_PUBLIC_USE_DB_MODELS=false

# Remove files if needed
rm -rf apps/web/src/lib/models/
rm packages/backend/convex/models/queries.ts
rm packages/backend/convex/models/mutations.ts
```

## Next Steps

- **Phase 3** creates admin UI using these mutations
- **Phase 4** gradually enables the feature flag
- **Phase 5** removes static config

---

**Phase 2 Complete!** Move to **[phase-3-admin-ui.md](./phase-3-admin-ui.md)** next.
