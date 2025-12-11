# Phase 6: Normalize Conversation Metadata

**Timeline**: Week 7-8 (6-8 days)
**Impact**: Per-model token tracking, historical usage analysis, cleaner conversations table
**Risk Level**: Low - Token tracking is denormalized cache, easy to rebuild

---

## Why This Migration?

### Current Problem

Token usage stored as nested object in conversations:

```typescript
// convex/schema.ts:114-123
tokenUsage: v.optional(
  v.object({
    systemTokens: v.number(),
    messagesTokens: v.number(),
    memoriesTokens: v.number(),
    totalTokens: v.number(),
    contextLimit: v.number(),
    lastCalculatedAt: v.number(),
  }),
),
```

**Issues**:
1. **No per-model breakdown**: Can't see token usage by model when switching mid-conversation
2. **No history**: Overwritten on each calculation, can't track trends
3. **Denormalized**: Could be derived from messages, but cached for performance
4. **Array growth**: If tracking per-model, object keys grow unbounded

### SQL-Readiness Benefits
- **Time-series data**: Query token usage over time
- **Per-model analytics**: "Which model uses most tokens in this conversation?"
- **Aggregate queries**: Sum tokens across conversations for billing

---

## Database Schema Changes

### New Table

```typescript
// convex/schema.ts - Add after conversations table

conversationTokenUsage: defineTable({
  conversationId: v.id("conversations"),
  model: v.string(),  // "openai:gpt-4o", "anthropic:claude-3-5-sonnet"
  totalTokens: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  reasoningTokens: v.optional(v.number()),  // For models with reasoning
  messageCount: v.number(),  // How many messages contributed to this
  lastUpdatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_conversation_model", ["conversationId", "model"]),
```

### Conversations Table Updates

```typescript
// convex/schema.ts:97-140
conversations: defineTable({
  // ... existing fields ...
  tokenUsage: v.optional(v.object({...})),  // DEPRECATED
})
```

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

Add `conversationTokenUsage` table, keep old `tokenUsage` field.

---

### Step 2: Backfill Data (Day 2-3)

```typescript
// convex/migrations/006_normalize_conversation_tokens.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const backfillTokenUsage = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number()
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let usageRecordsCreated = 0;

    for (const conv of conversations.page) {
      // Strategy: Rebuild from messages (source of truth)
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", q => q.eq("conversationId", conv._id))
        .collect();

      // Group tokens by model
      const tokensByModel = new Map<string, {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        reasoningTokens: number;
        messageCount: number;
      }>();

      for (const msg of messages) {
        if (!msg.model || msg.status !== "complete") continue;

        const model = msg.model;
        if (!tokensByModel.has(model)) {
          tokensByModel.set(model, {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            messageCount: 0,
          });
        }

        const stats = tokensByModel.get(model)!;
        stats.inputTokens += msg.inputTokens || 0;
        stats.outputTokens += msg.outputTokens || 0;
        stats.reasoningTokens += msg.reasoningTokens || 0;
        stats.totalTokens += (msg.inputTokens || 0) + (msg.outputTokens || 0);
        stats.messageCount += 1;
      }

      // Insert usage records
      for (const [model, stats] of tokensByModel.entries()) {
        await ctx.db.insert("conversationTokenUsage", {
          conversationId: conv._id,
          model,
          totalTokens: stats.totalTokens,
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          reasoningTokens: stats.reasoningTokens > 0 ? stats.reasoningTokens : undefined,
          messageCount: stats.messageCount,
          lastUpdatedAt: Date.now(),
          createdAt: conv.createdAt,
        });
        usageRecordsCreated++;
      }
    }

    return {
      done: conversations.isDone,
      nextCursor: conversations.continueCursor,
      processed: conversations.page.length,
      usageRecordsCreated,
    };
  },
});

export const migrateConversationTokens = internalAction({
  handler: async (ctx) => {
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalRecords = 0;
    const startTime = Date.now();

    console.log("🚀 Starting conversation token usage migration...");

    do {
      const result = await ctx.runMutation(
        internal.migrations["006_normalize_conversation_tokens"].backfillTokenUsage,
        { cursor, batchSize: 50 }
      );

      cursor = result.nextCursor;
      totalProcessed += result.processed;
      totalRecords += result.usageRecordsCreated;

      console.log(`✅ Migrated ${totalProcessed} conversations (${totalRecords} usage records)`);
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Conversations: ${totalProcessed}`);
    console.log(`   Usage records: ${totalRecords}`);
    console.log(`   Avg models per conversation: ${(totalRecords / totalProcessed).toFixed(1)}`);
    console.log(`   Duration: ${duration}s`);
  },
});
```

---

### Step 3: Update Token Tracking (Day 4-5)

#### Update Message Completion

**File**: `convex/ai/generateResponse.ts` (lines 250-280)

**Current**: Updates conversation.tokenUsage object
**New**: Update conversationTokenUsage table

```typescript
// convex/conversations.ts - Add helper

export const updateTokenUsage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find existing usage record for this model
    const existing = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation_model", q =>
        q.eq("conversationId", args.conversationId).eq("model", args.model)
      )
      .unique();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        totalTokens: existing.totalTokens + args.inputTokens + args.outputTokens,
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        reasoningTokens: existing.reasoningTokens
          ? existing.reasoningTokens + (args.reasoningTokens || 0)
          : args.reasoningTokens,
        messageCount: existing.messageCount + 1,
        lastUpdatedAt: Date.now(),
      });
    } else {
      // Create new record
      await ctx.db.insert("conversationTokenUsage", {
        conversationId: args.conversationId,
        model: args.model,
        totalTokens: args.inputTokens + args.outputTokens,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        reasoningTokens: args.reasoningTokens,
        messageCount: 1,
        lastUpdatedAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // ALSO update old tokenUsage object during transition (dual-write)
    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      const oldUsage = conv.tokenUsage || {
        systemTokens: 0,
        messagesTokens: 0,
        memoriesTokens: 0,
        totalTokens: 0,
        contextLimit: 0,
        lastCalculatedAt: Date.now(),
      };

      await ctx.db.patch(args.conversationId, {
        tokenUsage: {
          ...oldUsage,
          messagesTokens: oldUsage.messagesTokens + args.inputTokens + args.outputTokens,
          totalTokens: oldUsage.totalTokens + args.inputTokens + args.outputTokens,
          lastCalculatedAt: Date.now(),
        },
      });
    }
  },
});
```

#### Query Token Usage by Model

```typescript
// convex/conversations.ts

export const getConversationTokensByModel = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const usage = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", q => q.eq("conversationId", conversationId))
      .collect();

    return usage.map(u => ({
      model: u.model,
      totalTokens: u.totalTokens,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      reasoningTokens: u.reasoningTokens,
      messageCount: u.messageCount,
    }));
  },
});

export const getTotalConversationTokens = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const usage = await ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", q => q.eq("conversationId", conversationId))
      .collect();

    return usage.reduce((total, u) => total + u.totalTokens, 0);
  },
});
```

---

### Step 4: Update Frontend (Day 6)

#### Display Per-Model Usage

```typescript
// src/components/usage/ConversationCostBreakdown.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ConversationCostBreakdown({ conversationId }) {
  const tokensByModel = useQuery(
    api.conversations.getConversationTokensByModel,
    { conversationId }
  );

  if (!tokensByModel || tokensByModel.length === 0) {
    return <div>No usage data</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Token Usage by Model</h3>
      {tokensByModel.map((usage) => (
        <div key={usage.model} className="flex justify-between text-sm">
          <span>{usage.model}</span>
          <div className="text-right">
            <div>{usage.totalTokens.toLocaleString()} tokens</div>
            <div className="text-xs text-gray-500">
              {usage.messageCount} messages
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### Step 5: Cleanup (Day 7-8)

1. Remove `tokenUsage` object from conversations schema
2. Remove dual-write logic
3. Deploy and verify

---

## Critical Gotchas

### 1. Source of Truth is Messages, Not Cached Usage

**Current**: `tokenUsage` object manually updated, can drift from reality
**New**: Always rebuildable from messages table

**Gotcha**: If migration finds discrepancies between old `tokenUsage` and message totals, messages win.

### 2. Message Deletion Requires Usage Recalculation

**Current**: Deleting message doesn't update `tokenUsage`
**New**: Must decrement usage when message deleted

```typescript
// In deleteMessage mutation:
if (message.inputTokens || message.outputTokens) {
  const usage = await ctx.db
    .query("conversationTokenUsage")
    .withIndex("by_conversation_model", q =>
      q.eq("conversationId", message.conversationId).eq("model", message.model)
    )
    .unique();

  if (usage) {
    await ctx.db.patch(usage._id, {
      totalTokens: usage.totalTokens - (message.inputTokens + message.outputTokens),
      inputTokens: usage.inputTokens - message.inputTokens,
      outputTokens: usage.outputTokens - message.outputTokens,
      messageCount: usage.messageCount - 1,
    });
  }
}
```

### 3. Reasoning Tokens Optional

**Only some models** (o1, o3, etc.) have `reasoningTokens`
**Schema**: `reasoningTokens: v.optional(v.number())`

**Gotcha**: Don't sum undefined as 0. Only increment if present.

---

## Testing Checklist

- [ ] **Switch models mid-conversation**: Each model tracked separately
- [ ] **Query token breakdown**: Shows per-model usage + total
- [ ] **Migration stats**: Avg models per conversation (expect 1.2-1.5)
- [ ] **Delete message**: Usage decremented correctly
- [ ] **Reasoning tokens**: Tracked for o1/o3 models

---

## Success Metrics

- **Query speed**: Per-model breakdown <50ms
- **Data accuracy**: Usage matches sum of messages
- **Storage**: ~200 bytes per conversation-model pair (minimal overhead)

---

## Next Phase

After Phase 6 complete → **Phase 7: Final Optimizations** (memory metadata, N+1 fixes, indexes)
