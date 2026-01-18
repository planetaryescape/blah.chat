# Tree-Based Message Architecture

> **Phase**: P7-architecture | **Effort**: 12h | **Impact**: 87.5% storage reduction
> **Dependencies**: None | **Breaking**: Yes (schema migration)

---

## Problem Statement

Current implementation creates a new conversation when branching, copying all messages. This causes massive storage waste (800MB per 100K branched conversations), prevents cross-branch queries, blinds analytics to branching patterns, and limits features like true message editing/regeneration. The flat structure doesn't represent the natural tree-like nature of conversations with branches.

### Current Behavior

```typescript
// Creates NEW conversation with copied messages
const createBranch = async (fromMessageId) => {
  const originalConv = await getConversation(fromMessageId);
  const newConv = await createConversation({
    parentConversationId: originalConv._id,
    messages: [...originalConv.messagesUpTo(fromMessageId)], // DUPLICATE!
  });
  return newConv;
};
```

**Storage Waste Calculation**:
```
Average message: 200 characters = 200 bytes
Branch depth: 10 messages deep
100,000 branched conversations

Content waste: 10 × 200 × 100,000 = 200MB
With embeddings: +1536 dims × 4 bytes × 10 × 100K = 614MB

Total: 800MB wasted storage
```

### Expected Behavior

- Messages store parent/child relationships (tree pointers)
- Branches share common ancestor messages (no duplication)
- Cross-branch queries possible
- Analytics can track branching patterns
- Edit/regenerate creates branches, not copies

---

## Current Implementation

**File**: `packages/backend/convex/schema.ts`

```typescript
// Flat structure - no parent/child relationships
defineTable("messages", {
  conversationId: v.id("conversations"),
  content: v.string(),
  role: v.string(),
  // No tree structure fields
})
```

---

## Solution

Migrate to a tree-based message architecture where messages track parent-child relationships.

### Step 1: Schema Redesign

**File**: `packages/backend/convex/schema.ts`

```typescript
defineTable("messages", {
  // Existing fields
  conversationId: v.id("conversations"),
  content: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  model: v.optional(v.string()),
  status: v.string(),

  // Tree structure (NEW)
  parentMessageIds: v.array(v.id("messages")), // Multiple parents = merges
  childMessageIds: v.array(v.id("messages")),
  rootMessageId: v.optional(v.id("messages")), // For quick root access

  // Branch metadata (NEW)
  branchId: v.string(),
  branchLabel: v.optional(v.string()), // "main", "main.1", "main.2"
  branchIndex: v.optional(v.number()),
  isActive: v.boolean(), // Only one branch active at a time
  treePosition: v.number(), // For global ordering

  // Fork info (NEW)
  forkReason: v.optional(v.union(
    v.literal("user_edit"),
    v.literal("model_comparison"),
    v.literal("regenerate"),
    v.literal("alternative_response")
  )),
  forkMetadata: v.optional(v.object({
    originalContent: v.optional(v.string()),
    originalBranchId: v.optional(v.string()),
    originalCreatedAt: v.optional(v.number()),
    branchedAt: v.optional(v.number()),
    branchedBy: v.optional(v.id("users")),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  // Indexes for tree queries
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_branch", ["branchId", "treePosition"])
  .index("by_root", ["rootMessageId", "createdAt"])
  .index("by_parent", ["conversationId", "parentMessageIds"])
  .index("by_active_branch", ["conversationId", "isActive", "treePosition"])
```

### Step 2: Tree Position Calculation

**File**: `packages/backend/convex/lib/tree-utils.ts`

```typescript
/**
 * Calculate tree position for a new message
 * Position allows up to 1000 children per parent
 */
export function calculateTreePosition(
  parent: Message | null,
  siblingCount: number
): number {
  if (!parent) {
    // Root level: use timestamp for global ordering
    return Date.now();
  }

  // Child: position slightly after parent
  // Each sibling gets a 0.001 offset
  const offset = siblingCount * 0.001;
  return parent.treePosition + offset;
}

/**
 * Generate branch label from parent
 */
export function generateBranchLabel(
  parentLabel: string | undefined,
  branchIndex: number
): string {
  const base = parentLabel || 'main';
  return `${base}.${branchIndex}`;
}

/**
 * Get path from root to message
 */
export async function getMessagePath(
  ctx: QueryCtx,
  messageId: Id<"messages">
): Promise<Message[]> {
  const path: Message[] = [];
  let current = await ctx.db.get(messageId);

  while (current) {
    path.unshift(current);

    if (current.parentMessageIds.length > 0) {
      // Follow first parent (primary path)
      current = await ctx.db.get(current.parentMessageIds[0]);
    } else {
      break;
    }
  }

  return path;
}

/**
 * Get all descendants of a message
 */
export async function getDescendants(
  ctx: QueryCtx,
  messageId: Id<"messages">,
  activeOnly = false
): Promise<Message[]> {
  const descendants: Message[] = [];
  const queue = [messageId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = await ctx.db.get(currentId);

    if (!current) continue;
    if (activeOnly && !current.isActive) continue;

    descendants.push(current);
    queue.push(...current.childMessageIds);
  }

  return descendants;
}
```

### Step 3: Migration Script

**File**: `packages/backend/convex/migrations/tree-architecture.ts`

```typescript
import { internalMutation } from '../_generated/server';

const BATCH_SIZE = 100;

/**
 * Migration: Convert flat messages to tree structure
 * Run incrementally to avoid timeouts
 */
export const migrateToTreeBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get batch of conversations
    let query = ctx.db.query("conversations");
    if (args.cursor) {
      query = query.filter(q => q.gt(q.field("_id"), args.cursor));
    }

    const conversations = await query
      .order("asc")
      .take(BATCH_SIZE);

    if (conversations.length === 0) {
      return { done: true, migrated: 0 };
    }

    let migrated = 0;

    for (const conv of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", q => q.eq("conversationId", conv._id))
        .order("asc")
        .collect();

      // Build tree from flat list
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const previous = i > 0 ? messages[i - 1] : null;

        const treeFields = {
          parentMessageIds: previous ? [previous._id] : [],
          childMessageIds: [],
          rootMessageId: previous?.rootMessageId || previous?._id || null,
          branchId: `branch-${conv._id}`,
          branchLabel: 'main',
          isActive: true,
          treePosition: message._creationTime,
        };

        if (!args.dryRun) {
          await ctx.db.patch(message._id, treeFields);

          // Update previous message's children
          if (previous) {
            await ctx.db.patch(previous._id, {
              childMessageIds: [...(previous.childMessageIds || []), message._id],
            });
          }
        }

        migrated++;
      }
    }

    return {
      done: false,
      cursor: conversations[conversations.length - 1]._id,
      migrated,
    };
  },
});

/**
 * Verify migration integrity
 */
export const verifyTreeIntegrity = internalMutation({
  handler: async (ctx) => {
    const issues: string[] = [];

    const messages = await ctx.db.query("messages").take(1000);

    for (const message of messages) {
      // Verify parent-child consistency
      for (const parentId of message.parentMessageIds || []) {
        const parent = await ctx.db.get(parentId);
        if (!parent) {
          issues.push(`Message ${message._id} references non-existent parent ${parentId}`);
        } else if (!parent.childMessageIds?.includes(message._id)) {
          issues.push(`Parent ${parentId} doesn't list child ${message._id}`);
        }
      }

      // Verify child-parent consistency
      for (const childId of message.childMessageIds || []) {
        const child = await ctx.db.get(childId);
        if (!child) {
          issues.push(`Message ${message._id} references non-existent child ${childId}`);
        } else if (!child.parentMessageIds?.includes(message._id)) {
          issues.push(`Child ${childId} doesn't list parent ${message._id}`);
        }
      }
    }

    return { issues, checked: messages.length };
  },
});
```

### Step 4: Query Active Conversation Path

**File**: `packages/backend/convex/messages.ts`

```typescript
/**
 * Get active message path for a conversation
 * Returns only the currently active branch
 */
export const getActiveConversationMessages = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // Get all active messages for this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_active_branch", q =>
        q.eq("conversationId", args.conversationId)
         .eq("isActive", true)
      )
      .order("asc")
      .collect();

    // Sort by tree position
    return messages.sort((a, b) => a.treePosition - b.treePosition);
  },
});

/**
 * Get all branches at a specific message
 */
export const getBranchesAtMessage = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return [];

    // Get all children (each child is a potential branch point)
    const branches = await Promise.all(
      message.childMessageIds.map(id => ctx.db.get(id))
    );

    return branches.filter(Boolean).map(branch => ({
      id: branch!._id,
      label: branch!.branchLabel,
      isActive: branch!.isActive,
      forkReason: branch!.forkReason,
      createdAt: branch!.createdAt,
    }));
  },
});
```

### Migration Strategy

#### Phase 1: Dual-Write (1 Sprint)
- Add tree fields to schema (nullable initially)
- Write to both flat and tree structures on create/update
- Read from flat (existing logic still works)
- Backfill tree structure nightly for old data

#### Phase 2: Migrate Reads (1 Sprint)
- Create new query functions using tree structure
- Run both old and new queries, compare results
- Fix any discrepancies
- Gradually switch to tree reads

#### Phase 3: Retire Flat (1 Sprint)
- Stop writing to flat structure
- Mark flat fields as deprecated
- Monitor for 1 week
- Drop unused indexes

---

## Testing

### Unit Tests

```typescript
describe('Tree Architecture', () => {
  describe('Migration', () => {
    it('should convert flat messages to tree structure', async () => {
      const convId = await createTestConversation();
      const messageIds = await createFlatMessages(convId, 5);

      await migrateToTreeBatch({ dryRun: false });

      const messages = await getMessagesForConversation(convId);

      // Each message should have parent (except first)
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].parentMessageIds).toEqual([messages[i - 1]._id]);
      }

      // First message should have no parent
      expect(messages[0].parentMessageIds).toEqual([]);
    });

    it('should verify tree integrity', async () => {
      await setupTestTree();

      const { issues, checked } = await verifyTreeIntegrity();

      expect(issues).toHaveLength(0);
      expect(checked).toBeGreaterThan(0);
    });
  });

  describe('Tree Operations', () => {
    it('should get active conversation path', async () => {
      const convId = await createTestConversation();
      await createTreeWithBranches(convId);

      const activePath = await getActiveConversationMessages({ conversationId: convId });

      // Should only include active messages
      expect(activePath.every(m => m.isActive)).toBe(true);

      // Should be in tree position order
      for (let i = 1; i < activePath.length; i++) {
        expect(activePath[i].treePosition).toBeGreaterThan(activePath[i - 1].treePosition);
      }
    });

    it('should get branches at message', async () => {
      const parentId = await createTestMessage('Parent');

      await createBranch({ fromMessageId: parentId, content: 'Branch 1' });
      await createBranch({ fromMessageId: parentId, content: 'Branch 2' });

      const branches = await getBranchesAtMessage({ messageId: parentId });

      expect(branches).toHaveLength(2);
    });
  });
});
```

### Integration Tests

```typescript
describe('Tree Migration Integration', () => {
  it('should migrate 100 conversations without data loss', async () => {
    // Create 100 test conversations with varying message counts
    const conversationIds = await createBulkTestConversations(100);

    // Count total messages before
    const beforeCount = await countAllMessages();

    // Run full migration
    let cursor = undefined;
    while (true) {
      const result = await migrateToTreeBatch({ cursor });
      if (result.done) break;
      cursor = result.cursor;
    }

    // Count total messages after
    const afterCount = await countAllMessages();

    // No messages should be lost
    expect(afterCount).toBe(beforeCount);

    // All messages should have tree fields
    const messages = await getAllMessages();
    for (const msg of messages) {
      expect(msg.branchId).toBeDefined();
      expect(msg.treePosition).toBeDefined();
      expect(msg.isActive).toBe(true);
    }
  });
});
```

---

## Expected Results

### Storage Savings

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| 100K branches storage | 20GB | 2.5GB | 87.5% reduction |
| Avg. branch creation | Copy 10 msgs | 1 pointer | 90% less data |
| Cloud storage cost | ~$20/mo | ~$2.50/mo | 87.5% savings |

### Query Performance

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Get conversation | O(n) scan | O(depth) tree walk | Faster |
| Find branches | O(n) scan + filter | O(1) index lookup | Much faster |
| Compare branches | O(n²) nested | O(n + m) parallel | Significantly faster |

### Feature Enablement

| Feature | Before | After |
|---------|--------|-------|
| Edit message | Not possible | Create branch |
| Regenerate | Requires copy | Just add sibling |
| Compare responses | Manual | Side-by-side |
| Visual tree view | Not possible | Natural representation |
| Backtracking | Not possible | Navigate history |

---

## Risk Assessment

- **Risk Level**: HIGH (schema change)
- **Breaking Changes**: Yes (database schema)
- **DB Migration**: Complex (requires incremental backfill)
- **Rollback Possible**: Yes (dual-write period)
- **Testing Required**: Extensive (all message operations)
- **User Impact**: Positive (enables new features)

---

## References

- **Sources**: kimi/05-architecture/01-tree-based-schema.md, IMPLEMENTATION-SPECIFICATION.md
- **Convex Schema**: https://docs.convex.dev/database/schemas
- **Related Issues**: P7-architecture/02-message-operations.md, P7-architecture/03-branch-comparison.md
