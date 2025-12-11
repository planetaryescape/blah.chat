# Phase 3: Normalize Project-Conversation Relationships

**Timeline**: Week 4 (6-8 days)
**Impact**: 10x faster cascade deletes, eliminates O(N) project scans, enables efficient project queries
**Risk Level**: High - Touches critical deletion paths, monthly rebuild job becomes obsolete

---

## Why This Migration?

### Current Problem

Projects store conversation relationships as an array:

```typescript
// convex/schema.ts:351
conversationIds: v.array(v.id("conversations")),
```

Conversations have reverse pointer:
```typescript
// convex/schema.ts:105
projectId: v.optional(v.id("projects")),
```

**This creates TWO sources of truth with serious performance issues.**

### The Cascade Delete Disaster

**File**: `convex/conversations.ts:282-294`

```typescript
// Current: O(P * C) complexity
const projects = await ctx.db
  .query("projects")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();  // ⚠️ Fetches ALL user's projects

for (const project of projects) {
  if (project.conversationIds.includes(args.conversationId)) {  // ⚠️ O(C) per project
    await ctx.db.patch(project._id, {
      conversationIds: project.conversationIds.filter(
        (id) => id !== args.conversationId  // ⚠️ Full array rebuild
      ),
    });
  }
}
```

**Performance**:
- User with 20 projects × 100 conversations each = 2,000 `array.includes()` checks
- Bulk delete 50 conversations = 100,000 operations
- Each project patch rewrites entire array (8KB for 1000 conversations)

### The Stale Array Problem

**Monthly rebuild job** (`convex/projects/crons.ts:20-25`):
```typescript
crons.monthly(
  "rebuild-project-conversations",
  { day: 1, hourUTC: 2, minuteUTC: 0 },
  internal.projects.crons.rebuildAllProjects,
);
```

Why needed? **Because arrays get out of sync.**

**Failure scenario**:
```typescript
// Thread 1: Delete conversation
await ctx.db.patch(project._id, {
  conversationIds: project.conversationIds.filter(...)  // Array updated
});
// ⚠️ CRASH before reaching conversation delete
await ctx.db.delete(conversationId);  // Never executes

// Result: Array cleaned but conversation still exists with projectId pointing to project
// UI shows wrong count until monthly rebuild
```

### SQL-Readiness Benefits
- **Single source of truth**: Junction table eliminates dual-state
- **Proper foreign keys**: `projectConversations.projectId → projects._id`
- **Cascade deletes**: Database handles relationship cleanup
- **Efficient queries**: Index on both sides (by_project, by_conversation)

---

## Database Schema Changes

### New Junction Table

```typescript
// convex/schema.ts - Add after projects table

projectConversations: defineTable({
  projectId: v.id("projects"),
  conversationId: v.id("conversations"),
  addedAt: v.number(),
  addedBy: v.id("users"),  // Audit trail
})
  .index("by_project", ["projectId"])
  .index("by_conversation", ["conversationId"])
  .index("by_project_conversation", ["projectId", "conversationId"]),  // Uniqueness check
```

### Projects Table Updates

```typescript
// convex/schema.ts:346-358
projects: defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  conversationIds: v.optional(v.array(v.id("conversations"))),  // ⚠️ DEPRECATED
  isTemplate: v.optional(v.boolean()),
  createdFrom: v.optional(v.id("projects")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_userId_isTemplate", ["userId", "isTemplate"]),
```

**No changes to conversations table** - `projectId` field remains as source of truth.

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

**Checklist**:
- [ ] Add `projectConversations` junction table
- [ ] Make `projects.conversationIds` optional
- [ ] Deploy schema
- [ ] Verify table created

---

### Step 2: Backfill Data (Day 2)

```typescript
// convex/migrations/003_normalize_project_relationships.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const backfillProjectConversations = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number()
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const projects = await ctx.db
      .query("projects")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let linksCreated = 0;
    let inconsistenciesFound = 0;

    for (const project of projects.page) {
      if (!project.conversationIds?.length) continue;

      for (const convId of project.conversationIds) {
        // Verify conversation exists and points back to project
        const conv = await ctx.db.get(convId);

        if (!conv) {
          console.warn(`Stale conversation ID ${convId} in project ${project._id}`);
          inconsistenciesFound++;
          continue;
        }

        if (conv.projectId !== project._id) {
          console.warn(`Conversation ${convId} projectId mismatch: ${conv.projectId} vs ${project._id}`);
          inconsistenciesFound++;
          // Use conversation's projectId as source of truth
          continue;
        }

        // Check if relationship already exists (idempotent)
        const existing = await ctx.db
          .query("projectConversations")
          .withIndex("by_project_conversation", q =>
            q.eq("projectId", project._id).eq("conversationId", convId)
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("projectConversations", {
            projectId: project._id,
            conversationId: convId,
            addedAt: conv.createdAt,  // Best guess
            addedBy: project.userId,
          });
          linksCreated++;
        }
      }
    }

    return {
      done: projects.isDone,
      nextCursor: projects.continueCursor,
      processed: projects.page.length,
      linksCreated,
      inconsistenciesFound,
    };
  },
});

export const migrateProjectRelationships = internalAction({
  handler: async (ctx) => {
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalLinks = 0;
    let totalInconsistencies = 0;
    const startTime = Date.now();

    console.log("🚀 Starting project relationships migration...");

    do {
      const result = await ctx.runMutation(
        internal.migrations["003_normalize_project_relationships"].backfillProjectConversations,
        { cursor, batchSize: 50 }  // Smaller batch due to nested loops
      );

      cursor = result.nextCursor;
      totalProcessed += result.processed;
      totalLinks += result.linksCreated;
      totalInconsistencies += result.inconsistenciesFound;

      console.log(`✅ Migrated ${totalProcessed} projects (${totalLinks} links, ${totalInconsistencies} inconsistencies)`);
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Projects: ${totalProcessed}`);
    console.log(`   Links created: ${totalLinks}`);
    console.log(`   Inconsistencies: ${totalInconsistencies}`);
    console.log(`   Duration: ${duration}s`);

    if (totalInconsistencies > 0) {
      console.warn(`\n⚠️  Found ${totalInconsistencies} inconsistencies between array and projectId`);
      console.warn(`   This is expected if monthly rebuild hasn't run recently.`);
      console.warn(`   Junction table uses conversation.projectId as source of truth.`);
    }
  },
});
```

---

### Step 3: Update Mutations (Day 3-5)

#### Delete Conversation (Performance Win!)

**File**: `convex/conversations.ts:282-294`

**BEFORE** (O(P * C)):
```typescript
// Scan ALL user's projects
const projects = await ctx.db
  .query("projects")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();

// Check each project's array
for (const project of projects) {
  if (project.conversationIds.includes(args.conversationId)) {
    await ctx.db.patch(project._id, {
      conversationIds: project.conversationIds.filter(
        (id) => id !== args.conversationId
      ),
    });
  }
}
```

**AFTER** (O(1)):
```typescript
// Direct index lookup - only fetches projects containing this conversation
const links = await ctx.db
  .query("projectConversations")
  .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
  .collect();

// Delete links (typically 0-1 results)
for (const link of links) {
  await ctx.db.delete(link._id);
}

// ALSO update old array during transition (dual-write)
if (links.length > 0) {
  for (const link of links) {
    const project = await ctx.db.get(link.projectId);
    if (project?.conversationIds) {
      await ctx.db.patch(link.projectId, {
        conversationIds: project.conversationIds.filter(
          id => id !== args.conversationId
        ),
      });
    }
  }
}
```

**Performance**: 20 projects × 100 convs = 2000 ops → ~1-2 ops

#### Add Conversation to Project

**File**: `convex/projects.ts:125-131`

**BEFORE**:
```typescript
if (!project.conversationIds.includes(args.conversationId)) {
  await ctx.db.patch(args.projectId, {
    conversationIds: [...project.conversationIds, args.conversationId],
    updatedAt: Date.now(),
  });
}
```

**AFTER**:
```typescript
// Check if link exists
const existing = await ctx.db
  .query("projectConversations")
  .withIndex("by_project_conversation", q =>
    q.eq("projectId", args.projectId).eq("conversationId", args.conversationId)
  )
  .unique();

if (!existing) {
  const user = await getCurrentUser(ctx);

  // Create link
  await ctx.db.insert("projectConversations", {
    projectId: args.projectId,
    conversationId: args.conversationId,
    addedAt: Date.now(),
    addedBy: user._id,
  });

  // Update conversation's projectId (source of truth)
  await ctx.db.patch(args.conversationId, {
    projectId: args.projectId,
    updatedAt: Date.now(),
  });

  // ALSO update old array during transition (dual-write)
  const project = await ctx.db.get(args.projectId);
  await ctx.db.patch(args.projectId, {
    conversationIds: [...(project?.conversationIds || []), args.conversationId],
    updatedAt: Date.now(),
  });
}
```

#### Remove Conversation from Project

**File**: `convex/projects.ts:156-158`

**BEFORE**:
```typescript
await ctx.db.patch(args.projectId, {
  conversationIds: project.conversationIds.filter(
    (id) => id !== args.conversationId
  ),
  updatedAt: Date.now(),
});
```

**AFTER**:
```typescript
// Find and delete link
const link = await ctx.db
  .query("projectConversations")
  .withIndex("by_project_conversation", q =>
    q.eq("projectId", args.projectId).eq("conversationId", args.conversationId)
  )
  .unique();

if (link) {
  await ctx.db.delete(link._id);

  // Clear conversation's projectId
  await ctx.db.patch(args.conversationId, {
    projectId: undefined,
    updatedAt: Date.now(),
  });

  // ALSO update old array during transition (dual-write)
  const project = await ctx.db.get(args.projectId);
  if (project?.conversationIds) {
    await ctx.db.patch(args.projectId, {
      conversationIds: project.conversationIds.filter(
        id => id !== args.conversationId
      ),
      updatedAt: Date.now(),
    });
  }
}
```

#### Delete Project

**File**: `convex/projects.ts:92-101`

**BEFORE**:
```typescript
for (const convId of project.conversationIds) {
  const conv = await ctx.db.get(convId);
  if (conv && conv.projectId === args.id) {
    await ctx.db.patch(convId, {
      projectId: undefined,
      updatedAt: Date.now(),
    });
  }
}
```

**AFTER**:
```typescript
// Find all links
const links = await ctx.db
  .query("projectConversations")
  .withIndex("by_project", q => q.eq("projectId", args.id))
  .collect();

// Clear conversation projectIds
for (const link of links) {
  const conv = await ctx.db.get(link.conversationId);
  if (conv && conv.projectId === args.id) {
    await ctx.db.patch(link.conversationId, {
      projectId: undefined,
      updatedAt: Date.now(),
    });
  }

  // Delete link
  await ctx.db.delete(link._id);
}

// Delete project
await ctx.db.delete(args.id);
```

#### Bulk Operations

**File**: `convex/conversations.ts:682-688` (bulkDelete)

**Performance win**: Process all conversations, then batch-delete links

```typescript
// Collect all conversation IDs being deleted
const conversationIds = args.conversationIds;

// Batch delete links (single query)
const links = await ctx.db
  .query("projectConversations")
  .collect();  // Can't filter by array, so collect all

const linksToDelete = links.filter(link =>
  conversationIds.includes(link.conversationId)
);

for (const link of linksToDelete) {
  await ctx.db.delete(link._id);
}
```

---

### Step 4: Update Queries (Day 6)

#### Get Project Conversations

**File**: `convex/projects.ts:233`

**BEFORE** (uses conversation index):
```typescript
const conversations = await ctx.db
  .query("conversations")
  .withIndex("by_projectId", q => q.eq("projectId", args.projectId))
  .collect();
```

**AFTER** (junction table for flexibility):
```typescript
// Get links
const links = await ctx.db
  .query("projectConversations")
  .withIndex("by_project", q => q.eq("projectId", args.projectId))
  .collect();

// Batch fetch conversations
const conversations = await Promise.all(
  links.map(link => ctx.db.get(link.conversationId))
);

// Filter out deleted conversations
return conversations.filter(Boolean);
```

**Note**: Could also keep using `by_projectId` index on conversations - it's equally valid. Junction table adds flexibility (e.g., ordering by `addedAt`, audit trail).

#### Frontend: Project Conversation Count

**File**: `src/components/projects/ProjectCard.tsx:65`

**BEFORE** (stale array):
```typescript
conversationCount: project.conversationIds?.length || 0,
```

**AFTER** (real-time query):
```typescript
// Add query
export const getProjectConversationCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const links = await ctx.db
      .query("projectConversations")
      .withIndex("by_project", q => q.eq("projectId", projectId))
      .collect();
    return links.length;
  },
});

// Use in component
const conversationCount = useQuery(
  api.projects.getProjectConversationCount,
  { projectId: project._id }
) || 0;
```

---

### Step 5: Cleanup (Day 7-8)

1. **Remove `conversationIds` from schema**:
```typescript
// DELETE from projects table:
// conversationIds: v.array(v.id("conversations")),
```

2. **Remove dual-write logic** from all mutations

3. **Delete monthly rebuild cron**:
```typescript
// DELETE from convex/projects/crons.ts:20-25
```

4. **Delete rebuild functions**:
```typescript
// DELETE convex/projects.ts:305 (rebuildConversationIds)
// DELETE convex/projects/crons.ts:14 (rebuildAllProjects)
```

5. **Deploy and verify**:
```bash
bun convex deploy
```

---

## Critical Gotchas

### 1. Dual Source of Truth During Transition

**Risk**: Array and junction table get out of sync during dual-write phase.

**Mitigation**:
- ALWAYS update `conversation.projectId` first (source of truth)
- Then update junction table
- Finally update array (cache)
- If crash occurs, monthly rebuild fixes array

### 2. Race Condition in Bulk Operations

**Scenario**:
```typescript
// Thread 1: assignConversations(projectA, [conv1])
await ctx.db.patch(conv1, { projectId: projectA });

// Thread 2: assignConversations(projectB, [conv1]) <-- concurrent!
await ctx.db.patch(conv1, { projectId: projectB });  // Wins

// Thread 1 continues:
await ctx.db.insert("projectConversations", { projectId: projectA, conversationId: conv1 });

// Result: conv1.projectId = projectB but link exists to projectA
```

**Mitigation**: Convex mutations are transactional, but across actions not guaranteed. Add validation:
```typescript
// Before creating link, verify projectId matches
const conv = await ctx.db.get(conversationId);
if (conv.projectId !== projectId) {
  throw new Error("Conversation projectId changed during operation");
}
```

### 3. Frontend Displays Stale Count

**Risk**: `project.conversationIds.length` cached in component until remount.

**Solution**: Switch to reactive query (getProjectConversationCount) - updates automatically.

### 4. Conversation in Multiple Projects (Prevented by Schema)

**Current**: `projectId: v.optional(v.id("projects"))` - singular, not array
**New**: Junction table allows multiple projects per conversation

**Decision point**: Do you want multi-project support?
- **No (current behavior)**: Add uniqueness constraint on `conversationId`
- **Yes (future-proof)**: Allow multiple links, but update UI to show all projects

**Recommendation**: Keep singular for now. Add composite index for validation:
```typescript
.index("by_conversation_unique", ["conversationId"])  // Enforce 1 project max
```

Then in addConversation mutation:
```typescript
const existingLinks = await ctx.db
  .query("projectConversations")
  .withIndex("by_conversation_unique", q => q.eq("conversationId", conversationId))
  .collect();

if (existingLinks.length > 0 && existingLinks[0].projectId !== projectId) {
  throw new Error("Conversation already belongs to another project");
}
```

### 5. Monthly Rebuild Becomes Obsolete

**Current**: `rebuildAllProjects` cron fixes array drift
**New**: No array = no drift

**Gotcha**: Don't delete rebuild until 100% migrated. Keep as safety net during dual-write phase.

---

## Testing Checklist

- [ ] **Add conversation to project**: Link created, projectId updated
- [ ] **Delete conversation**: Link removed in <50ms (vs 2000ms before)
- [ ] **Bulk delete 50 conversations**: Completes in <5s (vs 30s+ before)
- [ ] **Project deleted**: All conversation projectIds cleared
- [ ] **Conversation removed from project**: Link deleted, projectId cleared
- [ ] **Frontend count**: Updates reactively when conversations added/removed
- [ ] **Migration stats**: Inconsistencies logged (compare to monthly rebuild)
- [ ] **Race condition**: Concurrent assignments handled gracefully

---

## Success Metrics

- **Delete performance**: 10-100x faster (measure with 20+ projects)
- **Code simplicity**: -50 lines in conversations.ts
- **Data consistency**: 0 inconsistencies (no monthly rebuild needed)
- **Query flexibility**: Can now query "conversations added this week to project"

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `convex/schema.ts` | 346-358 | Add projectConversations, deprecate conversationIds |
| `convex/conversations.ts` | 282-294, 516-523, 682-688 | Replace array scans with junction queries |
| `convex/projects.ts` | 92-101, 125-131, 156-158, 233 | Update all relationship mutations |
| `convex/projects/crons.ts` | 20-25 | Delete monthly rebuild (after cleanup) |
| `src/components/projects/ProjectCard.tsx` | 65 | Use reactive query for count |

---

## Next Phase

After Phase 3 complete → **Phase 4: User Preferences** (flatten nested object, atomic updates)
