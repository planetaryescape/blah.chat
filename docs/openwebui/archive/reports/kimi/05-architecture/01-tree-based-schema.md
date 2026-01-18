# Work Item: Migrate to Tree-Based Message Architecture

## Description
Replace the current flat message structure with a tree-based architecture that eliminates data duplication when branching conversations and enables true message-level branching (instead of conversation-level copying).

## Problem Statement
Current implementation creates new conversation when branching, copying all messages:
- **Storage waste**: 800MB per 100K branched conversations
- **Data duplication**: Same message content stored multiple times
- **No cross-branch queries**: Can't compare branches efficiently
- **Analytics blind**: Can't analyze branching patterns
- **Limited features**: Can't implement true message editing/regeneration

**Current Implementation**:
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

Waste: 10 × 200 × 100,000 = 200MB (content)
With embeddings: +1536 dims × 4 bytes × 10 × 100K = 614MB

Total: 800MB wasted storage
```

## Solution Specification
Implement true tree structure where messages store parent/child relationships instead of copying content.

## Implementation Steps

### Step 1: Schema Redesign
**File**: `packages/backend/convex/schema.ts`
```typescript
// Add to messages table
defineTable("messages", {
  // ... existing fields ...
  
  // Tree structure (NEW)
  parentMessageIds: v.array(v.id("messages")), // Multiple parents = merges
  childMessageIds: v.array(v.id("messages")),
  rootMessageId: v.optional(v.id("messages")),
  
  // Branch metadata (NEW)
  branchId: v.optional(v.string()),
  isActive: v.boolean(),
  treePosition: v.number(), // For global ordering
  
  // Fork info (NEW)
  forkReason: v.optional(v.string()), // "user_edit", "comparison", "regenerate"
  forkMetadata: v.optional(v.any()),
})
// Indexes for tree queries
.index("by_branch", ["branchId", "treePosition"])
.index("by_root", ["rootMessageId", "createdAt"])
.index("by_parent", ["parentMessageIds"]) // For finding children
```

### Step 2: Create Migration Script
**File**: `packages/backend/convex/migrations/2026-01-tree-architecture.ts`
```typescript
import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Migration: Convert flat messages to tree structure
 */
export const migrateToTree = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    
    for (const conv of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => 
          q.eq("conversationId", conv._id)
        )
        .order("asc")
        .collect();
      
      // Build tree from flat list
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const previous = i > 0 ? messages[i - 1] : null;
        
        await ctx.db.patch(message._id, {
          parentMessageIds: previous ? [previous._id] : [],
          childMessageIds: [],
          rootMessageId: previous?._id || null,
          branchId: `branch-${conv._id}`,
          isActive: true,
          treePosition: message.createdAt,
        });
      }
    }
  },
});
```

### Step 3: Update Message Creation
**File**: `packages/backend/convex/messages.ts:100-150`
```typescript
export const createMessageInTree = internalMutation({
  args: {
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    parentId: v.optional(v.id("messages")),
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parent = args.parentId ? await ctx.db.get(args.parentId) : null;
    const conv = await ctx.db.get(args.conversationId);
    
    if (!conv) throw new Error("Conversation not found");
    
    const message = await ctx.db.insert("messages", {
      content: args.content,
      role: args.role,
      conversationId: args.conversationId,
      parentMessageIds: args.parentId ? [args.parentId] : [],
      childMessageIds: [],
      rootMessageId: parent?.rootMessageId || 
                      (args.role === "user" ? null : args.parentId),
      branchId: args.branchId || parent?.branchId || `branch-${Date.now()}`,
      isActive: true,
      treePosition: parent ? parent.treePosition + 0.001 : Date.now(),
      createdAt: Date.now(),
    });
    
    // Update parent's children
    if (args.parentId) {
      await ctx.db.patch(args.parentId, {
        childMessageIds: [...parent!.childMessageIds, message],
      });
    }
    
    return message;
  },
});
```

### Step 4: Implement Branch Creation
**File**: `packages/backend/convex/messages.ts:600-680`
```typescript
export const createBranch = internalMutation({
  args: {
    fromMessageId: v.id("messages"),
    newContent: v.string(),
    forkReason: v.string(),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.fromMessageId);
    if (!original) throw new Error("Message not found");
    
    // Create new branch message
    const branched = await ctx.db.insert("messages", {
      ...original,
      content: args.newContent,
      parentMessageIds: [original._id], // Points to original
      childMessageIds: [],
      branchId: `branch-${Date.now()}`, // NEW branch
      isActive: true,
      treePosition: original.treePosition + 0.001,
      forkReason: args.forkReason,
      forkMetadata: {
        originalContent: original.content,
        originalBranchId: original.branchId,
        timestamp: Date.now(),
      },
    });
    
    // Add to original's children (multiple children = branch point!)
    await ctx.db.patch(original._id, {
      childMessageIds: [...original.childMessageIds, branched._id],
    });
    
    // Deactivate siblings (keep only one active branch)
    const siblings = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => 
        q.eq("parentMessageIds", original._id)
      )
      .filter((q) => q.neq(q.field("_id"), branched._id))
      .collect();
    
    for (const sibling of siblings) {
      await ctx.db.patch(sibling._id, { isActive: false });
    }
    
    return branched;
  },
});
```

## Expected Results

### Storage Savings
```
Before (copy-on-branch):
- 100,000 conversations
- 10 branches each
- Avg 10 messages per branch
- Storage: 100M messages = 20GB

After (tree structure):
- 100,000 conversations
- 10 branches each (pointer-based)
- Same messages (shared)
- Storage: 10M messages = 2GB + overhead = 2.5GB

Savings: 20GB → 2.5GB = 87.5% reduction = 17.5GB saved
Cloud cost savings: ~$5/month ($60/year)
```

### Query Performance
```
Before (flat structure):
- Get conversation messages: O(n) scan
- Find branches: O(n) scan + filter
- Compare branches: O(n²) nested loops

After (tree structure):
- Get active path: O(depth) = O(log n)
- Find branches: O(1) index lookup
- Compare branches: O(n + m)

Complexity improvement: O(n²) → O(n log n)
```

### Feature Enablement
```
Before (flat):
- Edit message: ❌ Not possible
- Regenerate: ❌ Requires copy
- Compare responses: ❌ Manual
- Visual tree view: ❌ Not possible

After (tree):
- Edit message: ✅ Create new branch
- Regenerate: ✅ Just add sibling
- Compare responses: ✅ Side-by-side
- Visual tree view: ✅ Natural representation
- Backtracking: ✅ Navigate history
```

## Testing Verification

### Migration Test
```typescript
it('should migrate flat messages to tree structure', async () => {
  // Setup: Create conversation with flat messages
  const convId = await createTestConversation();
  const messageIds = await createTestMessages(convId, 10);
  
  // Run migration
  await migrateToTree();
  
  // Verify tree structure
  const messages = await getAllMessages(convId);
  
  // Each message should have parent (except first)
  for (let i = 1; i < messages.length; i++) {
    expect(messages[i].parentMessageIds).toEqual([messages[i-1]._id]);
  }
  
  // Each message should have empty children (initially)
  messages.forEach(msg => {
    expect(msg.childMessageIds).toEqual([]);
  });
});
```

### Branch Creation Test
```typescript
it('should create branch with shared parent', async () => {
  const original = await createTestMessage('Hello');
  
  const branch = await createBranch({
    fromMessageId: original._id,
    newContent: 'Hello world',
    forkReason: 'user_edit',
  });
  
  // Verify branch points to parent
  expect(branch.parentMessageIds).toEqual([original._id]);
  
  // Verify parent lists branch as child
  const updatedOriginal = await getMessage(original._id);
  expect(updatedOriginal.childMessageIds).toContain(branch._id);
  
  // Verify fork metadata
  expect(branch.forkMetadata.originalContent).toBe('Hello');
});
```

## Migration Strategy

### Phase 1: Dual-Write (1 Sprint)
- Maintain both flat and tree structures
- Write to both on create/update
- Read from flat (existing logic)
- Backfill tree structure nightly for old data

### Phase 2: Migrate Reads (1 Sprint)
- Switch reads to tree structure
- Compare results, verify parity
- Fix any discrepancies

### Phase 3: Retire Flat (1 Sprint)
- Stop writing to flat structure
- Mark flat fields as deprecated
- Monitor for 1 week
- Drop flat columns in next release

## Risk Assessment
- **Risk Level**: HIGH (schema change)
- **Breaking Changes**: Yes (database schema)
- **DB Migration**: Complex (requires backfill)
- **Rollback Possible**: Yes (dual-write period)
- **Testing Required**: Extensive (all message operations)
- **User Impact**: Positive (enables new features)

## Priority
**MEDIUM** - High value but complex, plan for 3-sprint migration

## Related Work Items
- Work Item 01-03: Unicode splitting (affects tree structure integrity)
- Work Item 03-01: Concurrent generation lock (tree enables multiple active branches)
- Work Item 05-02: Message insertion (supports tree structure)
- Work Item 08-01: Auto titles (benefits from tree metadata)

## Additional Notes
- Consider adding migration progress tracking
- Backfill can be done incrementally (conversation by conversation)
- Old flat data can be archived before dropping
- Tree structure enables future features like message versioning
- Root pruning for very old branches can prevent infinite growth