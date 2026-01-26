# Phase 1: Schema Foundation + Seed Scripts

**Estimated Time**: 1.5 days
**Prerequisites**: None (first phase)
**Depends On**: Nothing
**Blocks**: Phase 2 (Repository), Phase 7 (Auto-Router Admin UI)

## Context

### What We're Building
This phase creates the database foundation for the entire model management and auto-router configuration system. We're adding 4 new Convex tables that will store:
1. **models** - All 40+ AI model configurations
2. **modelHistory** - Version tracking for model changes
3. **autoRouterConfig** - Singleton row with all router tuning parameters
4. **modelProfiles** - Category scores for each model (coding: 85, reasoning: 92, etc.)

### Why We're Doing This
Currently, all model data and auto-router parameters are hardcoded in TypeScript files:
- `packages/ai/src/models.ts` - Model definitions
- `apps/web/src/lib/ai/models.ts` - Web-specific extensions
- `packages/backend/convex/ai/autoRouter.ts` - Router scoring logic
- `packages/backend/convex/ai/modelProfiles.ts` - Category scores

Any change requires a code deploy. With database-backed config, admins can make changes via UI that take effect immediately.

### What Comes After
- **Phase 2** creates the repository layer to READ from these tables
- **Phase 3** creates admin UI to WRITE to these tables
- **Phase 7** creates auto-router admin UI

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/backend/convex/schema/models.ts` | Create | New schema module |
| `packages/backend/convex/schema.ts` | Modify | Import new tables |
| `packages/backend/convex/models/seed.ts` | Create | Seed models from static config |
| `packages/backend/convex/models/seedAutoRouter.ts` | Create | Seed auto-router config |

## Implementation

### Step 1: Create Schema Module

**File**: `packages/backend/convex/schema/models.ts`

```typescript
/**
 * Models and Auto-Router Configuration Schema
 * Part of database-backed model management migration
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

// All supported providers (15 total)
const providerValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("google"),
  v.literal("xai"),
  v.literal("perplexity"),
  v.literal("groq"),
  v.literal("cerebras"),
  v.literal("minimax"),
  v.literal("deepseek"),
  v.literal("kimi"),
  v.literal("zai"),
  v.literal("meta"),
  v.literal("mistral"),
  v.literal("alibaba"),
  v.literal("zhipu")
);

// Gateway options
const gatewayValidator = v.union(
  v.literal("vercel"),
  v.literal("openrouter")
);

// Speed tier options
const speedTierValidator = v.union(
  v.literal("instant"),
  v.literal("fast"),
  v.literal("standard"),
  v.literal("slow")
);

// Model status
const statusValidator = v.union(
  v.literal("active"),
  v.literal("deprecated"),
  v.literal("beta")
);

// Model history change types
const changeTypeValidator = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("deprecated")
);

/**
 * Models table - stores all AI model configurations
 * Replaces hardcoded MODEL_CONFIG in packages/ai/src/models.ts
 */
export const modelsTable = defineTable({
  // Identity
  id: v.string(), // "openai:gpt-5" (unique, matches static config keys)
  provider: providerValidator,
  name: v.string(),
  description: v.optional(v.string()),

  // Core properties
  contextWindow: v.number(),
  actualModelId: v.optional(v.string()), // Override model ID sent to provider
  isLocal: v.optional(v.boolean()), // For Ollama local models

  // Pricing (per 1M tokens, stored as USD)
  inputCost: v.number(),
  outputCost: v.number(),
  cachedInputCost: v.optional(v.number()),
  reasoningCost: v.optional(v.number()), // For thinking models

  // Capabilities (booleans for efficient Convex indexing)
  supportsVision: v.boolean(),
  supportsFunctionCalling: v.boolean(),
  supportsThinking: v.boolean(),
  supportsExtendedThinking: v.boolean(),
  supportsImageGeneration: v.boolean(),

  // Reasoning configuration (JSON string for flexibility)
  // Stores: { type, effortMapping, summaryLevel, useResponsesAPI, ... }
  reasoningConfig: v.optional(v.string()),

  // Routing configuration
  gateway: v.optional(gatewayValidator),
  hostOrder: v.optional(v.array(v.string())), // Fallback inference hosts

  // Display metadata
  knowledgeCutoff: v.optional(v.string()), // "November 2025" or "Real-time search"
  userFriendlyDescription: v.optional(v.string()), // Plain English for non-tech users
  bestFor: v.optional(v.string()), // Technical use case summary
  benchmarks: v.optional(v.string()), // JSON: { intelligence, coding, reasoning }
  speedTier: v.optional(speedTierValidator),

  // Access control
  isPro: v.optional(v.boolean()), // Requires premium tier
  isInternalOnly: v.optional(v.boolean()), // Hidden from picker (app ops only)
  isExperimental: v.optional(v.boolean()), // Beta/preview models

  // Status management
  status: statusValidator,

  // Audit fields
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.optional(v.id("users")),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_id", ["id"])
  .index("by_provider", ["provider"])
  .index("by_status", ["status"])
  .index("by_provider_status", ["provider", "status"])
  .index("by_capabilities", ["supportsVision", "supportsThinking"]);

/**
 * Model History table - tracks all changes to models
 * Enables audit trail, rollback, and compliance
 */
export const modelHistoryTable = defineTable({
  modelId: v.string(), // References models.id (not Convex ID for flexibility)
  version: v.number(), // Auto-increment per model (1, 2, 3, ...)
  changeType: changeTypeValidator,
  changes: v.array(
    v.object({
      field: v.string(),
      oldValue: v.any(),
      newValue: v.any(),
    })
  ),
  changedBy: v.optional(v.id("users")),
  changedAt: v.number(),
  reason: v.optional(v.string()), // User-provided change description
})
  .index("by_model", ["modelId"])
  .index("by_model_version", ["modelId", "version"]);

/**
 * Auto-Router Config table - singleton storing all router tuning parameters
 * Replaces hardcoded values in autoRouter.ts
 */
export const autoRouterConfigTable = defineTable({
  // Scoring bonuses (points added to model score)
  stickinessBonus: v.number(), // Default: 25 - bonus for keeping previous model
  reasoningBonus: v.number(), // Default: 15 - bonus for thinking-capable models
  researchBonus: v.number(), // Default: 25 - bonus for Perplexity on research tasks

  // Complexity multipliers
  simplePenalty: v.number(), // Default: 0.7 - multiplier for simple tasks
  complexBoostThreshold: v.number(), // Default: 85 - quality score needed for boost
  complexBoostMultiplier: v.number(), // Default: 1.2 - multiplier for complex tasks

  // Cost tier boundaries (avg cost per 1M tokens)
  cheapThreshold: v.number(), // Default: 1.0 - below this = "cheap" tier
  midThreshold: v.number(), // Default: 5.0 - below this = "mid" tier, above = "premium"

  // Tier weights by complexity (JSON string)
  // Format: { simple: { cheap: 0.6, mid: 0.25, premium: 0.15 }, moderate: {...}, complex: {...} }
  tierWeights: v.string(),

  // Speed bonuses by host/pattern (JSON string)
  // Format: { cerebras: 12, groq: 10, flash: 8, nano: 10, thinking: -5, ... }
  speedBonuses: v.string(),

  // Router settings
  routerModelId: v.string(), // Default: "openai:gpt-oss-120b"
  maxRetries: v.number(), // Default: 3
  contextBuffer: v.number(), // Default: 1.2 (20% safety margin)
  longContextThreshold: v.number(), // Default: 128000 tokens

  // High-stakes domains (JSON array)
  // Format: ["medical", "legal", "financial", "safety", "mental_health", ...]
  highStakesDomains: v.string(),

  // Audit
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
});

/**
 * Model Profiles table - category scores for auto-router
 * Replaces hardcoded MODEL_PROFILES in modelProfiles.ts
 */
export const modelProfilesTable = defineTable({
  modelId: v.string(), // References models.id
  qualityScore: v.number(), // 0-100 overall quality rating

  // Category scores as JSON string for flexibility
  // Format: { coding: 85, reasoning: 92, creative: 78, factual: 90, analysis: 88, conversation: 82, multimodal: 75, research: 70 }
  categoryScores: v.string(),

  // Audit
  updatedAt: v.number(),
  updatedBy: v.optional(v.id("users")),
})
  .index("by_model", ["modelId"]);
```

### Step 2: Import Tables in Main Schema

**File**: `packages/backend/convex/schema.ts`

Find the imports section and add:

```typescript
import {
  modelsTable,
  modelHistoryTable,
  autoRouterConfigTable,
  modelProfilesTable,
} from "./schema/models";
```

Find the `defineSchema({` section and add the tables:

```typescript
export default defineSchema({
  // ... existing tables ...

  // Model Management (Phase 1)
  models: modelsTable,
  modelHistory: modelHistoryTable,
  autoRouterConfig: autoRouterConfigTable,
  modelProfiles: modelProfilesTable,
});
```

### Step 3: Create Models Seed Script

**File**: `packages/backend/convex/models/seed.ts`

```typescript
/**
 * Seed script to populate models table from static MODEL_CONFIG
 * Run once during migration, idempotent (skips existing models)
 */
import { MODEL_CONFIG } from "@blah/ai";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedModels = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const models = Object.values(MODEL_CONFIG);
    let seededCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Skip AUTO_MODEL - it's a meta-model, not a real model
    const realModels = models.filter((m) => m.id !== "auto");

    for (const model of realModels) {
      try {
        // Check if model already exists
        const existing = await ctx.db
          .query("models")
          .withIndex("by_id", (q) => q.eq("id", model.id))
          .first();

        if (existing) {
          skippedCount++;
          continue;
        }

        if (args.dryRun) {
          console.log(`[DRY RUN] Would seed: ${model.id}`);
          seededCount++;
          continue;
        }

        // Transform static config to DB format
        const dbModel = {
          id: model.id,
          provider: model.provider,
          name: model.name,
          description: model.description,
          contextWindow: model.contextWindow,
          actualModelId: model.actualModelId,
          isLocal: model.isLocal ?? false,

          // Pricing
          inputCost: model.pricing.input,
          outputCost: model.pricing.output,
          cachedInputCost: model.pricing.cached,
          reasoningCost: model.pricing.reasoning,

          // Capabilities (convert array to booleans)
          supportsVision: model.capabilities?.includes("vision") ?? false,
          supportsFunctionCalling:
            model.capabilities?.includes("function-calling") ?? false,
          supportsThinking: model.capabilities?.includes("thinking") ?? false,
          supportsExtendedThinking:
            model.capabilities?.includes("extended-thinking") ?? false,
          supportsImageGeneration:
            model.capabilities?.includes("image-generation") ?? false,

          // Reasoning config as JSON
          reasoningConfig: model.reasoning
            ? JSON.stringify(model.reasoning)
            : undefined,

          // Routing
          gateway: model.gateway,
          hostOrder: model.hostOrder,

          // Display metadata
          knowledgeCutoff: model.knowledgeCutoff,
          userFriendlyDescription: model.userFriendlyDescription,
          bestFor: model.bestFor,
          benchmarks: model.benchmarks
            ? JSON.stringify(model.benchmarks)
            : undefined,
          speedTier: model.speedTier,

          // Access control
          isPro: model.isPro ?? false,
          isInternalOnly: model.isInternalOnly ?? false,
          isExperimental: model.isExperimental ?? false,

          // Status
          status: "active" as const,

          // Audit
          createdAt: Date.now(),
          updatedAt: Date.now(),
          // createdBy/updatedBy left undefined for seed (system operation)
        };

        await ctx.db.insert("models", dbModel);

        // Create initial history entry
        await ctx.db.insert("modelHistory", {
          modelId: model.id,
          version: 1,
          changeType: "created",
          changes: [],
          changedAt: Date.now(),
          reason: "Initial seed from static MODEL_CONFIG",
        });

        seededCount++;
      } catch (error) {
        errors.push(`${model.id}: ${error}`);
      }
    }

    const result = {
      seededCount,
      skippedCount,
      total: realModels.length,
      errors,
      dryRun: args.dryRun ?? false,
    };

    console.log(`Seed complete:`, result);
    return result;
  },
});
```

### Step 4: Create Auto-Router Config Seed Script

**File**: `packages/backend/convex/models/seedAutoRouter.ts`

```typescript
/**
 * Seed script to populate autoRouterConfig and modelProfiles tables
 * Seeds current hardcoded values from autoRouter.ts and modelProfiles.ts
 */
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Current hardcoded values from autoRouter.ts
const DEFAULT_CONFIG = {
  // Scoring bonuses
  stickinessBonus: 25,
  reasoningBonus: 15,
  researchBonus: 25,

  // Complexity multipliers
  simplePenalty: 0.7,
  complexBoostThreshold: 85,
  complexBoostMultiplier: 1.2,

  // Cost tier boundaries
  cheapThreshold: 1.0,
  midThreshold: 5.0,

  // Tier weights by complexity
  tierWeights: JSON.stringify({
    simple: { cheap: 0.6, mid: 0.25, premium: 0.15 },
    moderate: { cheap: 0.5, mid: 0.3, premium: 0.2 },
    complex: { cheap: 0.3, mid: 0.4, premium: 0.3 },
  }),

  // Speed bonuses
  speedBonuses: JSON.stringify({
    cerebras: 12,
    groq: 10,
    flash: 8,
    fast: 8,
    nano: 10,
    lite: 10,
    lightning: 12,
    thinking: -5,
    "extended-thinking": -8,
  }),

  // Router settings
  routerModelId: "openai:gpt-oss-120b",
  maxRetries: 3,
  contextBuffer: 1.2,
  longContextThreshold: 128000,

  // High-stakes domains
  highStakesDomains: JSON.stringify([
    "medical",
    "legal",
    "financial",
    "safety",
    "mental_health",
    "privacy",
    "immigration",
    "domestic_abuse",
  ]),
};

// Current hardcoded model profiles from modelProfiles.ts
const MODEL_PROFILES: Record<
  string,
  { qualityScore: number; categoryScores: Record<string, number> }
> = {
  "openai:gpt-5": {
    qualityScore: 95,
    categoryScores: {
      coding: 92,
      reasoning: 95,
      creative: 90,
      factual: 88,
      analysis: 94,
      conversation: 85,
      multimodal: 90,
      research: 80,
    },
  },
  "openai:gpt-5.1": {
    qualityScore: 96,
    categoryScores: {
      coding: 94,
      reasoning: 96,
      creative: 91,
      factual: 90,
      analysis: 95,
      conversation: 87,
      multimodal: 92,
      research: 82,
    },
  },
  "openai:gpt-5.2": {
    qualityScore: 97,
    categoryScores: {
      coding: 95,
      reasoning: 97,
      creative: 92,
      factual: 91,
      analysis: 96,
      conversation: 88,
      multimodal: 93,
      research: 83,
    },
  },
  "anthropic:claude-opus-4.5": {
    qualityScore: 96,
    categoryScores: {
      coding: 96,
      reasoning: 95,
      creative: 94,
      factual: 89,
      analysis: 95,
      conversation: 90,
      multimodal: 88,
      research: 78,
    },
  },
  "anthropic:claude-sonnet-4.5": {
    qualityScore: 92,
    categoryScores: {
      coding: 93,
      reasoning: 91,
      creative: 90,
      factual: 86,
      analysis: 91,
      conversation: 88,
      multimodal: 85,
      research: 75,
    },
  },
  "anthropic:claude-haiku-4.5": {
    qualityScore: 85,
    categoryScores: {
      coding: 82,
      reasoning: 80,
      creative: 78,
      factual: 82,
      analysis: 80,
      conversation: 85,
      multimodal: 75,
      research: 70,
    },
  },
  "google:gemini-2.5-flash": {
    qualityScore: 88,
    categoryScores: {
      coding: 85,
      reasoning: 86,
      creative: 82,
      factual: 88,
      analysis: 85,
      conversation: 80,
      multimodal: 90,
      research: 85,
    },
  },
  "google:gemini-2.5-pro": {
    qualityScore: 93,
    categoryScores: {
      coding: 90,
      reasoning: 93,
      creative: 88,
      factual: 92,
      analysis: 92,
      conversation: 85,
      multimodal: 94,
      research: 90,
    },
  },
  "google:gemini-3-flash": {
    qualityScore: 91,
    categoryScores: {
      coding: 88,
      reasoning: 90,
      creative: 85,
      factual: 91,
      analysis: 89,
      conversation: 83,
      multimodal: 92,
      research: 88,
    },
  },
  "perplexity:sonar-pro": {
    qualityScore: 85,
    categoryScores: {
      coding: 65,
      reasoning: 70,
      creative: 60,
      factual: 95,
      analysis: 80,
      conversation: 70,
      multimodal: 50,
      research: 98,
    },
  },
  "perplexity:sonar-reasoning-pro": {
    qualityScore: 87,
    categoryScores: {
      coding: 68,
      reasoning: 85,
      creative: 62,
      factual: 96,
      analysis: 82,
      conversation: 72,
      multimodal: 52,
      research: 98,
    },
  },
  "xai:grok-4-fast": {
    qualityScore: 88,
    categoryScores: {
      coding: 85,
      reasoning: 86,
      creative: 88,
      factual: 85,
      analysis: 84,
      conversation: 90,
      multimodal: 70,
      research: 75,
    },
  },
  "xai:grok-4.1-fast": {
    qualityScore: 90,
    categoryScores: {
      coding: 88,
      reasoning: 88,
      creative: 90,
      factual: 87,
      analysis: 86,
      conversation: 92,
      multimodal: 72,
      research: 78,
    },
  },
  "deepseek:deepseek-r1": {
    qualityScore: 91,
    categoryScores: {
      coding: 92,
      reasoning: 94,
      creative: 75,
      factual: 85,
      analysis: 90,
      conversation: 70,
      multimodal: 60,
      research: 80,
    },
  },
  "deepseek:deepseek-v3.2": {
    qualityScore: 88,
    categoryScores: {
      coding: 90,
      reasoning: 88,
      creative: 78,
      factual: 84,
      analysis: 86,
      conversation: 75,
      multimodal: 65,
      research: 78,
    },
  },
  "meta:llama-4-maverick": {
    qualityScore: 86,
    categoryScores: {
      coding: 85,
      reasoning: 84,
      creative: 82,
      factual: 83,
      analysis: 83,
      conversation: 85,
      multimodal: 80,
      research: 72,
    },
  },
  "mistral:mistral-large-3": {
    qualityScore: 87,
    categoryScores: {
      coding: 86,
      reasoning: 85,
      creative: 84,
      factual: 86,
      analysis: 85,
      conversation: 83,
      multimodal: 82,
      research: 74,
    },
  },
  "alibaba:qwen3-max": {
    qualityScore: 88,
    categoryScores: {
      coding: 87,
      reasoning: 86,
      creative: 80,
      factual: 88,
      analysis: 87,
      conversation: 78,
      multimodal: 75,
      research: 76,
    },
  },
  "minimax:minimax-m2": {
    qualityScore: 85,
    categoryScores: {
      coding: 88,
      reasoning: 82,
      creative: 78,
      factual: 82,
      analysis: 83,
      conversation: 80,
      multimodal: 70,
      research: 70,
    },
  },
  "minimax:minimax-m2.1": {
    qualityScore: 86,
    categoryScores: {
      coding: 89,
      reasoning: 84,
      creative: 79,
      factual: 83,
      analysis: 84,
      conversation: 81,
      multimodal: 72,
      research: 72,
    },
  },
};

export const seedAutoRouterConfig = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    forceReplace: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if config already exists
    const existing = await ctx.db.query("autoRouterConfig").first();

    if (existing && !args.forceReplace) {
      console.log("Auto-router config already exists, skipping seed");
      return { skipped: true, configId: existing._id };
    }

    if (args.dryRun) {
      console.log("[DRY RUN] Would seed auto-router config:", DEFAULT_CONFIG);
      return { dryRun: true };
    }

    // Delete existing if force replace
    if (existing && args.forceReplace) {
      await ctx.db.delete(existing._id);
    }

    // Insert config
    const configId = await ctx.db.insert("autoRouterConfig", {
      ...DEFAULT_CONFIG,
      updatedAt: Date.now(),
    });

    console.log("Seeded auto-router config:", configId);
    return { configId, seeded: true };
  },
});

export const seedModelProfiles = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let seededCount = 0;
    let skippedCount = 0;

    for (const [modelId, profile] of Object.entries(MODEL_PROFILES)) {
      // Check if profile exists
      const existing = await ctx.db
        .query("modelProfiles")
        .withIndex("by_model", (q) => q.eq("modelId", modelId))
        .first();

      if (existing) {
        skippedCount++;
        continue;
      }

      if (args.dryRun) {
        console.log(`[DRY RUN] Would seed profile: ${modelId}`);
        seededCount++;
        continue;
      }

      await ctx.db.insert("modelProfiles", {
        modelId,
        qualityScore: profile.qualityScore,
        categoryScores: JSON.stringify(profile.categoryScores),
        updatedAt: Date.now(),
      });

      seededCount++;
    }

    const result = {
      seededCount,
      skippedCount,
      total: Object.keys(MODEL_PROFILES).length,
      dryRun: args.dryRun ?? false,
    };

    console.log("Seed model profiles complete:", result);
    return result;
  },
});
```

### Step 5: Push Schema & Run Seeds

```bash
# 1. Push schema changes to Convex
cd packages/backend
bunx convex dev
# Wait for "Convex functions ready" message

# 2. Run seeds (dry run first)
bunx convex run models/seed:seedModels --args '{"dryRun": true}'
bunx convex run models/seedAutoRouter:seedAutoRouterConfig --args '{"dryRun": true}'
bunx convex run models/seedAutoRouter:seedModelProfiles --args '{"dryRun": true}'

# 3. Run actual seeds
bunx convex run models/seed:seedModels
bunx convex run models/seedAutoRouter:seedAutoRouterConfig
bunx convex run models/seedAutoRouter:seedModelProfiles
```

**Expected output**:
```
Seed complete: { seededCount: 40, skippedCount: 0, total: 40, errors: [] }
Seeded auto-router config: <convex_id>
Seed model profiles complete: { seededCount: 20, skippedCount: 0, total: 20 }
```

### Step 6: Verify in Convex Dashboard

1. Open Convex dashboard: https://dashboard.convex.dev
2. Navigate to your deployment
3. Click "Data" tab
4. Verify each table:

| Table | Expected Rows | Check |
|-------|---------------|-------|
| `models` | 40+ | All fields populated, no nulls on required fields |
| `modelHistory` | 40+ | One "created" entry per model |
| `autoRouterConfig` | 1 | All config values match defaults |
| `modelProfiles` | 20+ | Category scores are valid JSON |

## Validation Checklist

- [ ] `packages/backend/convex/schema/models.ts` created with all 4 table definitions
- [ ] `packages/backend/convex/schema.ts` imports and exports new tables
- [ ] Schema pushed to Convex without errors
- [ ] `models/seed.ts` created and runs successfully
- [ ] `models/seedAutoRouter.ts` created and runs successfully
- [ ] `models` table has 40+ rows with all fields
- [ ] `modelHistory` table has 40+ rows (one per model)
- [ ] `autoRouterConfig` has exactly 1 row with all config
- [ ] `modelProfiles` has 20+ rows with valid JSON scores
- [ ] Sample model verified:
  - [ ] id, provider, name populated
  - [ ] pricing fields correct (input/output/cached/reasoning)
  - [ ] capability booleans match static config
  - [ ] reasoningConfig is valid JSON (if applicable)
  - [ ] status = "active"
  - [ ] timestamps set

## Troubleshooting

**Error: "Cannot find module '@blah/ai'"**
- Ensure workspace package resolution is correct
- Alternative: Use relative import `../../packages/ai/src/models`

**Error: "Schema validation failed"**
- Check v.literal() spelling matches exactly
- Ensure all required fields have validators

**Error: "Duplicate key" during seed**
- Expected if running seed twice
- Models already exist, seed is idempotent

**Seed shows "0 seeded, 40 skipped"**
- Expected behavior if models already exist
- Use `forceReplace: true` for auto-router config if needed

## Rollback

If this phase causes issues:

```bash
# 1. Revert schema changes
git checkout packages/backend/convex/schema.ts
git checkout packages/backend/convex/schema/models.ts

# 2. Delete seed scripts
rm -rf packages/backend/convex/models/

# 3. Push reverted schema (Convex will drop tables)
bunx convex dev

# 4. Verify tables removed in dashboard
```

No other code depends on these tables yet - safe to rollback completely.

## Next Steps

After completing this phase:
- **Phase 2** creates repository layer to query these tables
- **Phase 7** creates auto-router admin UI to modify `autoRouterConfig`

---

**Phase 1 Complete!** Move to **[phase-2-repository.md](./phase-2-repository.md)** next.
