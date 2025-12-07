# Phase 3: Admin UI + CRUD Operations

**Estimated Time**: 3 days
**Prerequisites**: Phase 1-2 complete (schema + repository)
**Files to Create**:
- `convex/models/mutations.ts`
- `convex/models/bulk.ts`
- `src/components/settings/ModelsSettings.tsx`
- `src/components/settings/ModelDialog.tsx`

## Context

**Problem**: No UI to manage models. Need admin interface for CRUD + bulk operations.

**Solution**: Settings tab (admin-only) with DataTable, Dialog forms, import/export/duplicate.

## Architecture Overview

```
Settings Page
    ↓ admin-only tab
ModelsSettings.tsx
    ↓ list view (DataTable) + action buttons
ModelDialog.tsx
    ↓ create/edit form
Convex Mutations (mutations.ts, bulk.ts)
    ↓ write to DB + create history entries
```

## Implementation

### Step 1: Create Mutations

**File**: `convex/models/mutations.ts`

```typescript
import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const create = mutation({
  args: {
    id: v.string(),
    provider: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    contextWindow: v.number(),
    actualModelId: v.optional(v.string()),
    isLocal: v.optional(v.boolean()),
    inputCostPerMillion: v.number(),
    outputCostPerMillion: v.number(),
    cachedInputCostPerMillion: v.optional(v.number()),
    thinkingCostPerMillion: v.optional(v.number()),
    supportsVision: v.boolean(),
    supportsFunctionCalling: v.boolean(),
    supportsThinking: v.boolean(),
    supportsExtendedThinking: v.boolean(),
    supportsImageGeneration: v.boolean(),
    reasoningType: v.optional(v.string()),
    reasoningConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check admin role
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Check if ID already exists
    const existing = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      throw new Error(`Model ${args.id} already exists`);
    }

    // Insert model
    const modelId = await ctx.db.insert("models", {
      ...args,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userDoc._id,
      updatedBy: userDoc._id,
    });

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: 1,
      changeType: "created",
      changes: [],
      changedBy: userDoc._id,
      changedAt: Date.now(),
      reason: "Created via admin UI",
    });

    return { success: true, modelId };
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      contextWindow: v.optional(v.number()),
      inputCostPerMillion: v.optional(v.number()),
      outputCostPerMillion: v.optional(v.number()),
      cachedInputCostPerMillion: v.optional(v.number()),
      thinkingCostPerMillion: v.optional(v.number()),
      supportsVision: v.optional(v.boolean()),
      supportsFunctionCalling: v.optional(v.boolean()),
      supportsThinking: v.optional(v.boolean()),
      supportsExtendedThinking: v.optional(v.boolean()),
      supportsImageGeneration: v.optional(v.boolean()),
      reasoningType: v.optional(v.string()),
      reasoningConfig: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check admin
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get current model
    const model = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (!model) {
      throw new Error(`Model ${args.id} not found`);
    }

    // Calculate changes for history
    const changes = Object.entries(args.updates)
      .filter(([key, newValue]) => (model as any)[key] !== newValue)
      .map(([field, newValue]) => ({
        field,
        oldValue: (model as any)[field],
        newValue,
      }));

    if (changes.length === 0) {
      return { success: true, message: "No changes detected" };
    }

    // Update model
    await ctx.db.patch(model._id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: userDoc._id,
    });

    // Get latest version number
    const history = await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.id))
      .order("desc")
      .first();

    const nextVersion = (history?.version || 0) + 1;

    // Create history entry
    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: nextVersion,
      changeType: "updated",
      changes,
      changedBy: userDoc._id,
      changedAt: Date.now(),
      reason: args.reason,
    });

    return { success: true, version: nextVersion };
  },
});

export const del = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Check admin
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Soft delete: set status to deprecated
    const model = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .first();

    if (!model) {
      throw new Error(`Model ${args.id} not found`);
    }

    await ctx.db.patch(model._id, {
      status: "deprecated",
      updatedAt: Date.now(),
      updatedBy: userDoc._id,
    });

    // Create history entry
    const history = await ctx.db
      .query("modelHistory")
      .withIndex("by_model", (q) => q.eq("modelId", args.id))
      .order("desc")
      .first();

    await ctx.db.insert("modelHistory", {
      modelId: args.id,
      version: (history?.version || 0) + 1,
      changeType: "deprecated",
      changes: [{ field: "status", oldValue: model.status, newValue: "deprecated" }],
      changedBy: userDoc._id,
      changedAt: Date.now(),
      reason: "Deleted via admin UI",
    });

    return { success: true };
  },
});

export const duplicate = mutation({
  args: {
    sourceId: v.string(),
    newId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get source model
    const source = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.sourceId))
      .first();

    if (!source) {
      throw new Error(`Source model ${args.sourceId} not found`);
    }

    // Check new ID doesn't exist
    const existing = await ctx.db
      .query("models")
      .withIndex("by_id", (q) => q.eq("id", args.newId))
      .first();

    if (existing) {
      throw new Error(`Model ${args.newId} already exists`);
    }

    // Create duplicate
    const { _id, _creationTime, ...sourceData } = source;
    await ctx.db.insert("models", {
      ...sourceData,
      id: args.newId,
      name: args.newName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userDoc._id,
      updatedBy: userDoc._id,
    });

    // Create history
    await ctx.db.insert("modelHistory", {
      modelId: args.newId,
      version: 1,
      changeType: "created",
      changes: [],
      changedBy: userDoc._id,
      changedAt: Date.now(),
      reason: `Duplicated from ${args.sourceId}`,
    });

    return { success: true };
  },
});
```

### Step 2: Create Bulk Operations

**File**: `convex/models/bulk.ts`

```typescript
import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const exportJSON = mutation({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("deprecated"), v.literal("beta"))),
  },
  handler: async (ctx, args) => {
    // Check admin
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get models
    let query = ctx.db.query("models");

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const models = await query.collect();

    // Strip internal fields
    const exported = models.map((m) => {
      const { _id, _creationTime, createdBy, updatedBy, createdAt, updatedAt, ...rest } = m;
      return rest;
    });

    return { json: JSON.stringify(exported, null, 2) };
  },
});

export const importJSON = mutation({
  args: {
    json: v.string(),
    mode: v.union(v.literal("merge"), v.literal("replace")),
  },
  handler: async (ctx, args) => {
    // Check admin
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userDoc = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.subject))
      .first();

    if (userDoc?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Parse JSON
    let models: any[];
    try {
      models = JSON.parse(args.json);
    } catch (error) {
      throw new Error("Invalid JSON");
    }

    if (!Array.isArray(models)) {
      throw new Error("JSON must be an array of models");
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const model of models) {
      try {
        // Check required fields
        if (!model.id || !model.provider || !model.name) {
          errors.push(`Missing required fields: ${model.id || "unknown"}`);
          continue;
        }

        // Check if exists
        const existing = await ctx.db
          .query("models")
          .withIndex("by_id", (q) => q.eq("id", model.id))
          .first();

        if (existing) {
          if (args.mode === "merge") {
            // Update existing
            await ctx.db.patch(existing._id, {
              ...model,
              updatedAt: Date.now(),
              updatedBy: userDoc._id,
            });
            updated++;
          } else {
            errors.push(`Model ${model.id} already exists (replace mode)`);
          }
        } else {
          // Create new
          await ctx.db.insert("models", {
            ...model,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: userDoc._id,
            updatedBy: userDoc._id,
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to import ${model.id}: ${error}`);
      }
    }

    return { created, updated, errors };
  },
});
```

### Step 3: Create Admin UI Components

Due to length, see detailed UI code in `src/components/settings/ModelsSettings.tsx` pattern from `MemorySettings.tsx` (lines 54-538 from earlier read).

**Key structure**:
- Use `useQuery(api.models.queries.list)`
- Use `useMutation` for create/update/delete/duplicate
- shadcn DataTable for list view
- Dialog for create/edit forms
- Dropdown menu for bulk actions

### Step 4: Add Settings Tab

**File**: `src/app/(main)/settings/page.tsx`

Add new tab:

```tsx
{user?.role === "admin" && (
  <TabsTrigger value="models">Models</TabsTrigger>
)}

// In content:
{user?.role === "admin" && (
  <TabsContent value="models">
    <ModelsSettings />
  </TabsContent>
)}
```

## Validation Checklist

- [ ] `convex/models/mutations.ts` created
- [ ] `convex/models/bulk.ts` created
- [ ] `src/components/settings/ModelsSettings.tsx` created
- [ ] Settings tab shows "Models" for admin users
- [ ] Can create new model via UI
- [ ] Can edit existing model
- [ ] Can deprecate (delete) model
- [ ] Can duplicate model
- [ ] Export JSON downloads file
- [ ] Import JSON validates and inserts

## Rollback

```bash
rm convex/models/mutations.ts
rm convex/models/bulk.ts
rm src/components/settings/ModelsSettings.tsx
rm src/components/settings/ModelDialog.tsx
# Revert settings page changes
git checkout src/app/(main)/settings/page.tsx
```

---

**Phase 3 Complete!** ✅ Admin UI functional. Move to **[phase-4-rollout.md](./phase-4-rollout.md)** next.
