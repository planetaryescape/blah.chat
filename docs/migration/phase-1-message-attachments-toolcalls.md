# Phase 1: Normalize Message Attachments & Tool Calls

**Timeline**: Week 1-2 (10-12 days)
**Impact**: 40% reduction in message document size, eliminates duplicate attachments on branched conversations
**Risk Level**: Medium - High user visibility, streaming logic must remain resilient

---

## Why This Migration?

### Current Problem
Messages table stores attachments and tool calls as nested arrays:

```typescript
// convex/schema.ts:169-209
attachments: v.optional(v.array(v.object({
  type: v.union(v.literal("file"), v.literal("image"), v.literal("audio")),
  name: v.string(),
  storageId: v.string(),
  mimeType: v.string(),
  size: v.number(),
  metadata: v.optional(v.any()),  // ⚠️ Type safety issue
})))

toolCalls: v.optional(v.array(v.object({...})))
partialToolCalls: v.optional(v.array(v.object({...})))  // ⚠️ Duplication
```

**Issues**:
1. **Document bloat**: Average message with 2 images + 3 tool calls = ~5KB in arrays alone
2. **Duplication on branch**: Branching conversation duplicates parent attachments
3. **No attachment reuse**: Same file uploaded twice = two storage entries
4. **Type safety**: `metadata: v.any()` defeats validation
5. **Dual state**: `toolCalls` vs `partialToolCalls` creates complexity

### SQL-Readiness Benefits
Separate tables enable:
- Foreign key relationships (`attachments.messageId → messages._id`)
- Independent querying (all images across conversations)
- Proper indexing (`by_storage` to find which messages use a file)
- Cascade delete policies

---

## Database Schema Changes

### New Tables

```typescript
// convex/schema.ts - Add after messages table

attachments: defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),  // Denormalized for filtering
  type: v.union(v.literal("image"), v.literal("file"), v.literal("audio")),
  name: v.string(),
  storageId: v.id("_storage"),  // Changed from string to proper ID type
  mimeType: v.string(),
  size: v.number(),
  // Typed metadata instead of v.any()
  metadata: v.optional(v.object({
    // Image metadata
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    // Audio metadata
    duration: v.optional(v.number()),
    // Generated image metadata
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    generationTime: v.optional(v.number()),
  })),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_storage", ["storageId"]),

toolCalls: defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),  // Denormalized for filtering
  toolCallId: v.string(),  // AI SDK-generated unique ID
  toolName: v.string(),
  args: v.any(),  // JSON input to tool
  result: v.optional(v.any()),  // JSON output from tool
  textPosition: v.optional(v.number()),  // Character position in content for inline display
  isPartial: v.boolean(),  // Replaces separate partialToolCalls array
  timestamp: v.number(),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_message_partial", ["messageId", "isPartial"]),
```

### Messages Table Updates

```typescript
// convex/schema.ts:169-209 - Make these fields optional during transition
messages: defineTable({
  // ... existing fields ...

  // DEPRECATED - will be removed in cleanup step
  attachments: v.optional(v.array(v.object({...}))),
  toolCalls: v.optional(v.array(v.object({...}))),
  partialToolCalls: v.optional(v.array(v.object({...}))),
})
```

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

**Checklist**:
- [ ] Add `attachments` table to schema
- [ ] Add `toolCalls` table to schema
- [ ] Keep old message fields as optional
- [ ] Deploy via `bun convex deploy`
- [ ] Verify tables created in Convex dashboard

**No data changes yet** - schema only.

---

### Step 2: Backfill Data (Day 2-3)

Create migration script with pagination:

```typescript
// convex/migrations/001_normalize_message_attachments.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const backfillAttachments = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number()
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const messages = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let attachmentsCreated = 0;
    let toolCallsCreated = 0;

    for (const msg of messages.page) {
      // Skip if already migrated (no old-format data)
      if (!msg.attachments?.length && !msg.toolCalls?.length && !msg.partialToolCalls?.length) {
        continue;
      }

      // Migrate attachments
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          await ctx.db.insert("attachments", {
            messageId: msg._id,
            conversationId: msg.conversationId,
            type: att.type,
            name: att.name,
            storageId: att.storageId as any,  // Type conversion
            mimeType: att.mimeType,
            size: att.size,
            metadata: att.metadata,
            createdAt: msg.createdAt,
          });
          attachmentsCreated++;
        }
      }

      // Migrate tool calls (merge final + partial)
      const allToolCalls = [
        ...(msg.toolCalls || []).map(tc => ({ ...tc, isPartial: false })),
        ...(msg.partialToolCalls || []).map(tc => ({ ...tc, isPartial: true })),
      ];

      for (const tc of allToolCalls) {
        await ctx.db.insert("toolCalls", {
          messageId: msg._id,
          conversationId: msg.conversationId,
          toolCallId: tc.id,
          toolName: tc.name,
          args: JSON.parse(tc.arguments),
          result: tc.result ? JSON.parse(tc.result) : undefined,
          textPosition: tc.textPosition,
          isPartial: tc.isPartial,
          timestamp: tc.timestamp,
          createdAt: msg.createdAt,
        });
        toolCallsCreated++;
      }
    }

    return {
      done: messages.isDone,
      nextCursor: messages.continueCursor,
      processed: messages.page.length,
      attachmentsCreated,
      toolCallsCreated,
    };
  },
});

// Orchestrator action (call this from Convex dashboard)
export const migrateMessageAttachments = internalAction({
  handler: async (ctx) => {
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalAttachments = 0;
    let totalToolCalls = 0;
    const startTime = Date.now();

    console.log("🚀 Starting message attachment migration...");

    do {
      const result = await ctx.runMutation(
        internal.migrations["001_normalize_message_attachments"].backfillAttachments,
        { cursor, batchSize: 100 }
      );

      cursor = result.nextCursor;
      totalProcessed += result.processed;
      totalAttachments += result.attachmentsCreated;
      totalToolCalls += result.toolCallsCreated;

      console.log(`✅ Migrated ${totalProcessed} messages (${totalAttachments} attachments, ${totalToolCalls} tool calls)`);
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Messages: ${totalProcessed}`);
    console.log(`   Attachments: ${totalAttachments}`);
    console.log(`   Tool Calls: ${totalToolCalls}`);
    console.log(`   Duration: ${duration}s`);
  },
});
```

**Run migration**:
1. Open Convex dashboard → Functions
2. Find `migrations:001_normalize_message_attachments:migrateMessageAttachments`
3. Click "Run" (no args needed)
4. Monitor console logs for progress
5. Verify completion (check counts match)

---

### Step 3: Update Queries (Dual-Read Phase) (Day 4-6)

**Goal**: Read from new tables first, fallback to old structure for unmigrated messages.

#### Update Message Queries

```typescript
// convex/messages.ts - Add helper functions

async function getMessageAttachments(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">
) {
  // Try new table first
  const newAttachments = await ctx.db
    .query("attachments")
    .withIndex("by_message", q => q.eq("messageId", messageId))
    .collect();

  if (newAttachments.length > 0) {
    return newAttachments;
  }

  // Fallback to old structure (for unmigrated messages)
  const message = await ctx.db.get(messageId);
  return message?.attachments?.map(a => ({
    _id: "temp" as any,  // Temporary ID for compatibility
    messageId,
    conversationId: message.conversationId,
    ...a,
    createdAt: message.createdAt,
  })) || [];
}

async function getMessageToolCalls(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
  includePartial = false
) {
  // Try new table first
  const query = ctx.db
    .query("toolCalls")
    .withIndex("by_message", q => q.eq("messageId", messageId));

  const toolCalls = await query.collect();

  if (toolCalls.length > 0) {
    // Filter by partial flag if needed
    return includePartial
      ? toolCalls
      : toolCalls.filter(tc => !tc.isPartial);
  }

  // Fallback to old structure
  const message = await ctx.db.get(messageId);
  const oldToolCalls = includePartial
    ? [...(message?.toolCalls || []), ...(message?.partialToolCalls || [])]
    : (message?.toolCalls || []);

  return oldToolCalls.map(tc => ({
    _id: "temp" as any,
    messageId,
    conversationId: message!.conversationId,
    toolCallId: tc.id,
    toolName: tc.name,
    args: JSON.parse(tc.arguments),
    result: tc.result ? JSON.parse(tc.result) : undefined,
    textPosition: tc.textPosition,
    isPartial: false,
    timestamp: tc.timestamp,
    createdAt: message!.createdAt,
  }));
}

// Export for use in queries
export { getMessageAttachments, getMessageToolCalls };
```

#### Update Generation Streaming

**File**: `convex/generation.ts`

**Current code** (lines 744-777):
```typescript
// Streaming tool calls - writes to partialToolCalls array
await ctx.runMutation(internal.messages.updatePartialToolCalls, {
  messageId: args.assistantMessageId,
  partialToolCalls: Array.from(toolCallsBuffer.values()),
});
```

**New code**:
```typescript
// NEW MUTATION: Upsert tool calls to new table
export const upsertToolCall = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    toolCallId: v.string(),
    toolName: v.string(),
    args: v.any(),
    result: v.optional(v.any()),
    textPosition: v.optional(v.number()),
    isPartial: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db
      .query("toolCalls")
      .withIndex("by_message", q => q.eq("messageId", args.messageId))
      .filter(q => q.eq(q.field("toolCallId"), args.toolCallId))
      .unique();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        args: args.args,
        result: args.result,
        isPartial: args.isPartial,
        timestamp: args.timestamp,
      });
    } else {
      // Insert new
      await ctx.db.insert("toolCalls", {
        messageId: args.messageId,
        conversationId: args.conversationId,
        toolCallId: args.toolCallId,
        toolName: args.toolName,
        args: args.args,
        result: args.result,
        textPosition: args.textPosition,
        isPartial: args.isPartial,
        timestamp: args.timestamp,
        createdAt: Date.now(),
      });
    }

    // ALSO write to old location during transition (dual-write)
    const message = await ctx.db.get(args.messageId);
    const oldPartialToolCalls = message?.partialToolCalls || [];
    const updated = oldPartialToolCalls.filter(tc => tc.id !== args.toolCallId);
    updated.push({
      id: args.toolCallId,
      name: args.toolName,
      arguments: JSON.stringify(args.args),
      result: args.result ? JSON.stringify(args.result) : undefined,
      timestamp: args.timestamp,
      textPosition: args.textPosition,
    });

    await ctx.db.patch(args.messageId, {
      partialToolCalls: updated,
      updatedAt: Date.now(),
    });
  },
});

// Update streaming logic in generation.ts:
if (chunk.type === "tool-call") {
  await ctx.runMutation(internal.messages.upsertToolCall, {
    messageId: args.assistantMessageId,
    conversationId: args.conversationId,
    toolCallId: chunk.toolCallId,
    toolName: chunk.toolName,
    args: chunk.input,
    isPartial: true,
    timestamp: Date.now(),
    textPosition: accumulated.length,
  });
}
```

#### Update Frontend Components

**File**: `src/components/chat/ChatMessage.tsx`

**Current** (lines 113-128):
```typescript
const attachmentStorageIds = message.attachments?.map((a: any) => a.storageId) || [];
```

**New**:
```typescript
// Use Convex query to fetch attachments
const attachments = useQuery(
  api.messages.getAttachments,
  { messageId: message._id }
);

const attachmentStorageIds = attachments?.map(a => a.storageId) || [];
```

**Add query**:
```typescript
// convex/messages.ts
export const getAttachments = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    return getMessageAttachments(ctx, messageId);
  },
});
```

---

### Step 4: Cleanup (Day 7-8)

**Only after 100% migration verified**:

1. **Remove old fields from schema**:
```typescript
// convex/schema.ts - DELETE these lines:
// attachments: v.optional(v.array(v.object({...}))),
// toolCalls: v.optional(v.array(v.object({...}))),
// partialToolCalls: v.optional(v.array(v.object({...}))),
```

2. **Remove dual-write logic**:
   - Delete `updatePartialToolCalls` mutation
   - Remove old array writes from `upsertToolCall`
   - Remove fallback logic from `getMessageAttachments`/`getMessageToolCalls`

3. **Deploy schema**:
```bash
bun convex deploy
```

4. **Verify**:
   - [ ] No messages with old attachment arrays
   - [ ] All attachments queryable via new table
   - [ ] Tool calls display correctly
   - [ ] Streaming still works (test mid-generation refresh)

---

## Critical Gotchas

### 1. Attachment Streaming Doesn't Exist
**Current behavior** (lines 883-935 in generation.ts):
- Attachments added via `addAttachment` mutation **after** generation completes
- Generated images appear during streaming, but are written to DB immediately (not streamed)

**Gotcha**: No partial attachments field needed. Migration is simpler than tool calls.

### 2. Vision Model Filtering
**Current behavior** (lines 577-584 in generation.ts):
```typescript
// Only vision models process attachments
if (isVisionModel(modelId)) {
  // Download and convert to base64
} else {
  // Attachments silently ignored
}
```

**Gotcha**: Don't show loading state for attachments on non-vision models.

### 3. Tool Call textPosition Critical for UI
**Current behavior** (InlineToolCallContent.tsx:33-155):
- Uses `textPosition` to split content and interleave tool displays
- If missing, shows all tool calls at top (legacy behavior)

**Gotcha**: Must preserve `textPosition` during migration. Extract from:
```typescript
// generation.ts:744
textPosition: accumulated.length
```

### 4. Tool Result JSON Double-Encoding Risk
**Current behavior**:
- Tool result stored as `JSON.stringify(resultValue)`
- Frontend parses: `JSON.parse(call.result)`

**Gotcha**: In new schema, store as `v.any()` (native JSON), not string. Update frontend to NOT parse.

**Fix**:
```typescript
// OLD: Frontend expects stringified JSON
const parsedResult = JSON.parse(toolCall.result);

// NEW: Direct object access
const parsedResult = toolCall.result;
```

### 5. Partial Tool Calls Must Clear on Completion
**Current behavior** (lines 335 in messages.ts):
```typescript
await ctx.db.patch(messageId, {
  toolCalls: finalToolCalls,
  partialToolCalls: undefined,  // ⚠️ Critical: Clear streaming state
});
```

**Gotcha**: In new schema, update `isPartial: false` instead of deleting rows:
```typescript
// Mark all partial tool calls as complete
const partials = await ctx.db
  .query("toolCalls")
  .withIndex("by_message_partial", q =>
    q.eq("messageId", messageId).eq("isPartial", true)
  )
  .collect();

for (const tc of partials) {
  await ctx.db.patch(tc._id, { isPartial: false });
}
```

### 6. Duplicate Tool Call IDs
**Current behavior**: AI SDK generates unique IDs, but if mutation retries could create duplicates.

**Protection**:
```typescript
// Upsert pattern (check before insert)
const existing = await ctx.db
  .query("toolCalls")
  .withIndex("by_message", ...)
  .filter(q => q.eq(q.field("toolCallId"), toolCallId))
  .unique();

if (!existing) { /* insert */ }
```

---

## Testing Checklist

- [ ] **Send message with image**:
  - Verify attachment appears in new table
  - Verify no duplicate in old message.attachments
  - Check Convex dashboard: `attachments` table has row

- [ ] **Refresh mid-generation with tool calls**:
  - Partial tool calls appear in real-time
  - After completion, `isPartial: false`
  - Tool results display correctly

- [ ] **Query old migrated message**:
  - Attachments load from new table
  - No errors with fallback logic
  - UI displays correctly

- [ ] **Branch conversation with attachments**:
  - Parent message attachments NOT duplicated
  - New table references original attachment
  - Storage savings verified (same storageId)

- [ ] **Generated image**:
  - Appears during streaming
  - Metadata stored (prompt, model, generationTime)
  - Type validation works (not `v.any()`)

---

## Rollback Strategy

If issues found during transition:

1. **Revert queries to read old fields only**:
```typescript
// Disable new table reads
async function getMessageAttachments(ctx, messageId) {
  const message = await ctx.db.get(messageId);
  return message?.attachments || [];  // Skip new table
}
```

2. **Stop dual-write**:
   - Comment out new table inserts in mutations
   - Keep old array writes only

3. **Delete new table data** (if corrupted):
```typescript
// Convex dashboard or script
const attachments = await ctx.db.query("attachments").collect();
for (const att of attachments) {
  await ctx.db.delete(att._id);
}
```

4. **Keep old fields in schema** until confidence restored

---

## Success Metrics

- **Message size reduction**: 40% average (measure before/after in Convex dashboard)
- **Query performance**: Attachment queries <50ms (was N/A before)
- **Storage efficiency**: Branched conversations share attachments (deduplicated)
- **Type safety**: No `v.any()` metadata (proper object schema)
- **Zero downtime**: Dual-read/write ensures continuity

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `convex/schema.ts` | 141-294 | Add attachments, toolCalls tables |
| `convex/messages.ts` | 427-478 | Add helpers, update mutations |
| `convex/generation.ts` | 744-950 | Update streaming logic |
| `src/components/chat/ChatMessage.tsx` | 113-357 | Use new queries |
| `src/components/chat/ToolCallDisplay.tsx` | Full | Update to new schema |
| `src/components/chat/AttachmentRenderer.tsx` | Full | Update to new schema |

---

## Next Phase

After Phase 1 complete → **Phase 2: Message Sources & Metadata** (similar pattern, 8-10 days)
