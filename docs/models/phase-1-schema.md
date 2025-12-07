# Phase 1: Schema Foundation + Seed Script

**Estimated Time**: 1 day
**Prerequisites**: None (first phase)
**Files to Create**:
- `convex/schema.ts` (modifications)
- `convex/models/seed.ts` (new)

## Context

**Problem**: All 58 models hardcoded in `src/lib/ai/models.ts`. No version history, no dynamic updates.

**Solution**: Create Convex DB tables to store models + track history.

## Architecture Overview

```
convex/schema.ts
    ↓ defines models + modelHistory tables
convex/models/seed.ts
    ↓ populates DB from static config
Convex DB
    ↓ stores all 58 models with version history
```

## Implementation

### Step 1: Add Tables to Schema

**File**: `convex/schema.ts`

Find the `export default defineSchema({` section and add two new tables:

```typescript
models: defineTable({
  // Identity
  id: v.string(), // "openai:gpt-4o" (unique)
  provider: v.union(
    v.literal("openai"),
    v.literal("anthropic"),
    v.literal("google"),
    v.literal("xai"),
    v.literal("perplexity"),
    v.literal("ollama"),
    v.literal("openrouter"),
    v.literal("groq")
  ),
  name: v.string(),
  description: v.optional(v.string()),

  // Core Properties
  contextWindow: v.number(),
  actualModelId: v.optional(v.string()),
  isLocal: v.optional(v.boolean()),

  // Pricing (per 1M tokens)
  inputCostPerMillion: v.number(),
  outputCostPerMillion: v.number(),
  cachedInputCostPerMillion: v.optional(v.number()),
  thinkingCostPerMillion: v.optional(v.number()),

  // Capabilities (booleans for efficient querying)
  supportsVision: v.boolean(),
  supportsFunctionCalling: v.boolean(),
  supportsThinking: v.boolean(),
  supportsExtendedThinking: v.boolean(),
  supportsImageGeneration: v.boolean(),

  // Reasoning Config (stored as JSON string)
  reasoningType: v.optional(
    v.union(
      v.literal("openai-reasoning-effort"),
      v.literal("anthropic-extended-thinking"),
      v.literal("google-thinking-level"),
      v.literal("google-thinking-budget"),
      v.literal("deepseek-tag-extraction"),
      v.literal("generic-reasoning-effort")
    )
  ),
  reasoningConfig: v.optional(v.string()), // JSON blob of ReasoningConfig

  // Status Management
  status: v.union(
    v.literal("active"),
    v.literal("deprecated"),
    v.literal("beta")
  ),

  // Audit Fields
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
})
.index("by_id", ["id"])
.index("by_provider", ["provider"])
.index("by_status", ["status"])
.index("by_capabilities", ["supportsVision", "supportsThinking"]),

modelHistory: defineTable({
  modelId: v.string(), // References models.id
  version: v.number(), // Auto-increment per model
  changeType: v.union(
    v.literal("created"),
    v.literal("updated"),
    v.literal("deprecated")
  ),
  changes: v.array(
    v.object({
      field: v.string(),
      oldValue: v.any(),
      newValue: v.any(),
    })
  ),
  changedBy: v.id("users"),
  changedAt: v.number(),
  reason: v.optional(v.string()), // User-provided change description
})
.index("by_model", ["modelId"])
.index("by_model_version", ["modelId", "version"]),
```

**Also add `role` field to `users` table** (find existing `users` definition):

```typescript
users: defineTable({
  // ... existing fields (email, name, etc.)
  role: v.union(v.literal("user"), v.literal("admin")), // NEW
  // ... rest of existing fields
})
```

### Step 2: Create Seed Script Directory

```bash
mkdir -p convex/models
```

### Step 3: Create `convex/models/seed.ts`

**Full file content** (copy-paste ready):

```typescript
import { MODEL_CONFIG } from "../../src/lib/ai/models";
import { internalMutation } from "../_generated/server";

export const seedModels = internalMutation({
  handler: async (ctx) => {
    const models = Object.values(MODEL_CONFIG);
    let seededCount = 0;
    let skippedCount = 0;

    // Get system user for createdBy/updatedBy
    // In production, you'd get the actual admin user ID
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "system";

    for (const model of models) {
      // Check if model already exists
      const existing = await ctx.db
        .query("models")
        .withIndex("by_id", (q) => q.eq("id", model.id))
        .first();

      if (existing) {
        console.log(`Skipping ${model.id} (already exists)`);
        skippedCount++;
        continue;
      }

      // Insert model
      const modelDoc = await ctx.db.insert("models", {
        id: model.id,
        provider: model.provider,
        name: model.name,
        description: model.description,
        contextWindow: model.contextWindow,
        actualModelId: model.actualModelId,
        isLocal: model.isLocal || false,

        // Pricing
        inputCostPerMillion: model.pricing.input,
        outputCostPerMillion: model.pricing.output,
        cachedInputCostPerMillion: model.pricing.cached,
        thinkingCostPerMillion: model.pricing.reasoning,

        // Capabilities (convert array to booleans)
        supportsVision: model.capabilities.includes("vision"),
        supportsFunctionCalling: model.capabilities.includes("function-calling"),
        supportsThinking: model.capabilities.includes("thinking"),
        supportsExtendedThinking: model.capabilities.includes("extended-thinking"),
        supportsImageGeneration: model.capabilities.includes("image-generation"),

        // Reasoning
        reasoningType: model.reasoning?.type,
        reasoningConfig: model.reasoning ? JSON.stringify(model.reasoning) : undefined,

        // Status
        status: "active",

        // Audit
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userId as any, // Type assertion for system user
        updatedBy: userId as any,
      });

      // Create initial version history entry
      await ctx.db.insert("modelHistory", {
        modelId: model.id,
        version: 1,
        changeType: "created",
        changes: [], // No changes for initial creation
        changedBy: userId as any,
        changedAt: Date.now(),
        reason: "Initial seed from static config",
      });

      console.log(`✅ Seeded ${model.id}`);
      seededCount++;
    }

    console.log(`\n🎉 Seed complete: ${seededCount} created, ${skippedCount} skipped`);

    return {
      seededCount,
      skippedCount,
      total: models.length,
    };
  },
});
```

### Step 4: Run Convex Schema Push

```bash
# Push schema changes to Convex
npx convex dev
# Wait for "Convex functions ready" message
```

**Expected output**:
```
✔ Deploying convex/
✔ Pushed schema
Convex functions ready!
```

### Step 5: Run Seed Script

```bash
npx convex run models/seed:seedModels
```

**Expected output**:
```
✅ Seeded openai:gpt-5.1
✅ Seeded openai:gpt-5-pro
✅ Seeded openai:gpt-5
...
✅ Seeded groq:qwen3-32b

🎉 Seed complete: 58 created, 0 skipped
```

### Step 6: Verify in Convex Dashboard

1. Open Convex dashboard: https://dashboard.convex.dev
2. Navigate to your deployment
3. Click "Data" tab
4. Check `models` table → should see 58 rows
5. Check `modelHistory` table → should see 58 rows (all version 1, changeType "created")
6. Check any model row → verify all fields populated correctly

## Validation Checklist

- [ ] `convex/schema.ts` modified (2 new tables, 1 field added)
- [ ] `convex/models/seed.ts` created
- [ ] Schema pushed to Convex (`npx convex dev`)
- [ ] Seed script ran successfully (58 models created)
- [ ] Convex dashboard shows 58 models in `models` table
- [ ] Convex dashboard shows 58 history entries in `modelHistory` table
- [ ] Sample model has all fields populated:
  - [ ] id, provider, name
  - [ ] pricing fields (input/output/cached/thinking)
  - [ ] capability booleans
  - [ ] reasoning config (if applicable)
  - [ ] status = "active"
  - [ ] createdAt, updatedAt, createdBy, updatedBy

## What This Enables

**Query examples** (for Phase 2):

```typescript
// Get single model
const model = await ctx.db
  .query("models")
  .withIndex("by_id", (q) => q.eq("id", "openai:gpt-4o"))
  .first();

// Get all active models by provider
const anthropicModels = await ctx.db
  .query("models")
  .withIndex("by_provider", (q) => q.eq("provider", "anthropic"))
  .filter((q) => q.eq(q.field("status"), "active"))
  .collect();

// Get all models with vision capability
const visionModels = await ctx.db
  .query("models")
  .withIndex("by_capabilities", (q) => q.eq("supportsVision", true))
  .collect();

// Get change history for a model
const history = await ctx.db
  .query("modelHistory")
  .withIndex("by_model", (q) => q.eq("modelId", "openai:gpt-4o"))
  .order("desc") // Newest first
  .collect();
```

## Troubleshooting

**Error: "Cannot read property 'subject' of null"**
- Cause: No authenticated user when running seed
- Fix: The seed script handles this with fallback to "system"

**Error: "Field 'role' does not exist on table 'users'"**
- Cause: Forgot to add `role` field to users table
- Fix: Add the field to schema, push again

**Error: "Schema validation failed"**
- Cause: Typo in schema definition
- Fix: Check v.literal() spelling, ensure all fields have correct types

**Seed shows "0 created, 58 skipped"**
- Cause: Models already exist in DB
- Fix: This is expected if you run seed twice. Drop table + re-seed if needed:
  ```bash
  # In Convex dashboard → Data → models → "..." → "Delete all documents"
  # Then run seed again
  ```

## Rollback

If this phase causes issues:

```bash
# 1. Revert schema changes
git checkout convex/schema.ts

# 2. Push reverted schema
npx convex dev

# 3. Delete seed script
rm -rf convex/models

# 4. Convex will drop the tables automatically
```

No other files depend on this yet - safe to rollback.

## Next Steps

After completing this phase:
- **Phase 2** creates repository pattern to READ from these tables
- **Phase 3** creates admin UI to CRUD these tables
- **Phase 4** rolls out gradual feature flag
- **Phase 5** removes static config
- **Phase 6** adds optimization

## FAQ

**Q: Why store reasoning config as JSON string?**
A: Convex doesn't support complex nested objects well. JSON string is flexible + type-safe after parsing.

**Q: Why both `reasoningType` and `reasoningConfig`?**
A: `reasoningType` allows indexed querying ("find all OpenAI reasoning models"), `reasoningConfig` stores the full config.

**Q: What if I add a new field to ModelConfig later?**
A: Add it to schema, create migration script to backfill existing models.

**Q: Should I seed local dev or production first?**
A: Seed local dev first, test thoroughly, then seed production (or use feature flag rollout).

---

**Phase 1 Complete!** ✅ Schema created, DB seeded. Move to **[phase-2-repository.md](./phase-2-repository.md)** next.
