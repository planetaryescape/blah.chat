# Message Tree Operations

> **Phase**: P7-architecture | **Effort**: 8h | **Impact**: Enable branching features
> **Dependencies**: P7-architecture/01-tree-schema.md | **Breaking**: No

---

## Problem Statement

With the tree-based message architecture, we need proper insertion, editing, and branching operations that maintain tree integrity. Current operations work on flat structures and don't understand parent-child relationships, branch metadata, or tree positioning.

### Current Behavior

- Messages inserted without tree linkage
- Edits not possible (immutable messages)
- Branches require copying entire conversations
- No tree traversal capabilities

### Expected Behavior

- Messages linked to parents on insertion
- Edits create new branches (preserving history)
- Branches use pointers (zero duplication)
- Full tree traversal for any operation

---

## Current Implementation

```typescript
// Simple flat insertion
const createMessage = async (ctx, args) => {
  return ctx.db.insert("messages", {
    content: args.content,
    role: args.role,
    conversationId: args.conversationId,
    // No tree fields
  });
};
```

---

## Solution

Implement a MessageRepository class that handles all tree operations with proper integrity.

### Step 1: Create Message Repository

**File**: `packages/backend/convex/lib/message-repository.ts`

```typescript
import { MutationCtx, QueryCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

interface InsertArgs {
  content: string;
  role: 'user' | 'assistant' | 'system';
  conversationId: Id<'conversations'>;
  parentId?: Id<'messages'>;
  branchId?: string;
  model?: string;
  metadata?: Record<string, any>;
}

interface BranchArgs {
  fromMessageId: Id<'messages'>;
  newContent: string;
  forkReason: 'user_edit' | 'model_comparison' | 'regenerate' | 'alternative_response';
  userId: Id<'users'>;
}

export class MessageRepository {
  /**
   * Insert message into tree structure
   */
  async insert(ctx: MutationCtx, args: InsertArgs): Promise<Id<'messages'>> {
    // Validate conversation exists
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error('Conversation not found');

    // Get parent (if specified)
    let parent = null;
    if (args.parentId) {
      parent = await ctx.db.get(args.parentId);
      if (!parent) throw new Error('Parent message not found');
    }

    // Calculate tree position
    const treePosition = this.calculateTreePosition(parent);

    // Determine branch
    const branchId = args.branchId || parent?.branchId || `branch-${Date.now()}`;

    // Insert message
    const messageId = await ctx.db.insert('messages', {
      content: args.content,
      role: args.role,
      conversationId: args.conversationId,
      model: args.model,
      status: 'complete',

      // Tree structure
      parentMessageIds: args.parentId ? [args.parentId] : [],
      childMessageIds: [],
      rootMessageId: parent?.rootMessageId ||
                     (args.role === 'user' ? undefined : args.parentId),
      branchId,
      branchLabel: parent?.branchLabel || 'main',
      isActive: true,
      treePosition,

      // Metadata
      metadata: args.metadata || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link parent to child
    if (args.parentId && parent) {
      await ctx.db.patch(args.parentId, {
        childMessageIds: [...parent.childMessageIds, messageId],
      });
    }

    return messageId;
  }

  /**
   * Calculate tree position for ordering
   */
  private calculateTreePosition(parent: any): number {
    if (!parent) {
      return Date.now();
    }

    // Position slightly after parent
    // Allows up to 1000 children per parent
    const offset = parent.childMessageIds.length * 0.001;
    return parent.treePosition + offset;
  }

  /**
   * Create a branch from an existing message
   */
  async createBranch(ctx: MutationCtx, args: BranchArgs): Promise<{
    branchedId: Id<'messages'>;
    continuationId: Id<'messages'>;
  }> {
    const original = await ctx.db.get(args.fromMessageId);
    if (!original) throw new Error('Message not found');

    // Calculate branch index
    const branchIndex = original.childMessageIds.length + 1;

    // Create branched message
    const branchedId = await ctx.db.insert('messages', {
      content: args.newContent,
      role: original.role,
      conversationId: original.conversationId,
      model: original.model,
      status: 'complete',

      // Tree structure
      parentMessageIds: [original._id],
      childMessageIds: [],
      rootMessageId: original.rootMessageId,
      branchId: `branch-${Date.now()}`,
      branchLabel: `${original.branchLabel || 'main'}.${branchIndex}`,
      branchIndex,
      isActive: true,
      treePosition: original.treePosition + 0.001,

      // Fork metadata
      forkReason: args.forkReason,
      forkMetadata: {
        originalContent: original.content,
        originalBranchId: original.branchId,
        originalCreatedAt: original.createdAt,
        branchedAt: Date.now(),
        branchedBy: args.userId,
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Add to original's children
    await ctx.db.patch(original._id, {
      childMessageIds: [...original.childMessageIds, branchedId],
    });

    // Deactivate sibling branches
    await this.deactivateSiblings(ctx, original._id, branchedId);

    // Create continuation (assistant response placeholder)
    const continuationId = await ctx.db.insert('messages', {
      content: '',
      role: 'assistant',
      conversationId: original.conversationId,
      status: 'pending',

      parentMessageIds: [branchedId],
      childMessageIds: [],
      branchId: `branch-${Date.now()}`,
      isActive: true,
      treePosition: original.treePosition + 0.002,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link branched message to continuation
    await ctx.db.patch(branchedId, {
      childMessageIds: [continuationId],
    });

    return { branchedId, continuationId };
  }

  /**
   * Deactivate sibling branches
   */
  async deactivateSiblings(
    ctx: MutationCtx,
    parentId: Id<'messages'>,
    exceptId: Id<'messages'>
  ): Promise<void> {
    const parent = await ctx.db.get(parentId);
    if (!parent) return;

    const siblingIds = parent.childMessageIds.filter(id => id !== exceptId);

    for (const siblingId of siblingIds) {
      await ctx.db.patch(siblingId, { isActive: false });
      await this.deactivateDescendants(ctx, siblingId);
    }
  }

  /**
   * Recursively deactivate descendants
   */
  private async deactivateDescendants(
    ctx: MutationCtx,
    messageId: Id<'messages'>
  ): Promise<void> {
    const message = await ctx.db.get(messageId);
    if (!message) return;

    for (const childId of message.childMessageIds) {
      await ctx.db.patch(childId, { isActive: false });
      await this.deactivateDescendants(ctx, childId);
    }
  }

  /**
   * Get message with full tree context
   */
  async getWithContext(ctx: QueryCtx, id: Id<'messages'>) {
    const message = await ctx.db.get(id);
    if (!message) return null;

    const [parent, children] = await Promise.all([
      message.parentMessageIds.length > 0
        ? ctx.db.get(message.parentMessageIds[0])
        : null,
      Promise.all(message.childMessageIds.map(cid => ctx.db.get(cid))),
    ]);

    return {
      ...message,
      parent,
      children: children.filter(Boolean),
      hasBranches: children.length > 1,
    };
  }

  /**
   * Get full path from root to message
   */
  async getPath(ctx: QueryCtx, messageId: Id<'messages'>): Promise<any[]> {
    const path = [];
    let current = await ctx.db.get(messageId);

    while (current) {
      path.unshift(current);

      if (current.parentMessageIds.length > 0) {
        current = await ctx.db.get(current.parentMessageIds[0]);
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * Switch active branch at a branch point
   */
  async switchBranch(
    ctx: MutationCtx,
    branchMessageId: Id<'messages'>
  ): Promise<void> {
    const branch = await ctx.db.get(branchMessageId);
    if (!branch) throw new Error('Branch not found');

    const parentId = branch.parentMessageIds[0];
    if (!parentId) throw new Error('Branch has no parent');

    // Activate this branch and its descendants
    await ctx.db.patch(branchMessageId, { isActive: true });
    await this.activateDescendants(ctx, branchMessageId);

    // Deactivate siblings
    await this.deactivateSiblings(ctx, parentId, branchMessageId);
  }

  /**
   * Recursively activate descendants
   */
  private async activateDescendants(
    ctx: MutationCtx,
    messageId: Id<'messages'>
  ): Promise<void> {
    const message = await ctx.db.get(messageId);
    if (!message) return;

    // Only activate the first child (primary path)
    if (message.childMessageIds.length > 0) {
      const firstChildId = message.childMessageIds[0];
      await ctx.db.patch(firstChildId, { isActive: true });
      await this.activateDescendants(ctx, firstChildId);
    }
  }
}
```

### Step 2: Update Send Message Flow

**File**: `packages/backend/convex/chat.ts`

```typescript
import { MessageRepository } from './lib/message-repository';

export const sendMessage = internalMutation({
  args: {
    conversationId: v.id('conversations'),
    content: v.string(),
    parentId: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const repo = new MessageRepository();

    // Create user message
    const userMessageId = await repo.insert(ctx, {
      content: args.content,
      role: 'user',
      conversationId: args.conversationId,
      parentId: args.parentId,
    });

    // Create assistant message placeholder
    const assistantMessageId = await repo.insert(ctx, {
      content: '',
      role: 'assistant',
      conversationId: args.conversationId,
      parentId: userMessageId,
      metadata: { status: 'pending' },
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      existingMessageId: assistantMessageId,
    });

    return {
      userMessageId,
      assistantMessageId,
    };
  },
});
```

### Step 3: Edit Message Mutation

**File**: `packages/backend/convex/messages.ts`

```typescript
export const editMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const original = await ctx.db.get(args.messageId);

    if (!original) throw new Error('Message not found');
    if (original.role !== 'user') throw new Error('Can only edit user messages');

    const repo = new MessageRepository();

    // Create branch with edited content
    const { branchedId, continuationId } = await repo.createBranch(ctx, {
      fromMessageId: args.messageId,
      newContent: args.newContent,
      forkReason: 'user_edit',
      userId: user._id,
    });

    // Schedule regeneration
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      existingMessageId: continuationId,
    });

    return { branchedId, continuationId };
  },
});
```

### Step 4: Regenerate Response Mutation

**File**: `packages/backend/convex/messages.ts`

```typescript
export const regenerateResponse = internalMutation({
  args: {
    messageId: v.id('messages'),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const original = await ctx.db.get(args.messageId);

    if (!original) throw new Error('Message not found');
    if (original.role !== 'assistant') throw new Error('Can only regenerate assistant messages');

    const repo = new MessageRepository();

    // Get the user message this was responding to
    const userMessageId = original.parentMessageIds[0];
    if (!userMessageId) throw new Error('No parent user message found');

    const userMessage = await ctx.db.get(userMessageId);
    if (!userMessage) throw new Error('Parent user message not found');

    // Create new assistant response as sibling branch
    const { branchedId, continuationId } = await repo.createBranch(ctx, {
      fromMessageId: userMessageId,
      newContent: userMessage.content, // Same user message
      forkReason: 'regenerate',
      userId: user._id,
    });

    // Schedule generation with potentially different model
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      existingMessageId: continuationId,
      modelId: args.modelId || original.model,
    });

    return { branchedId, continuationId };
  },
});
```

### Step 5: Frontend Hooks

**File**: `apps/web/src/hooks/useBranching.ts`

```typescript
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useBranching(conversationId: string) {
  const editMessageMutation = useMutation(api.messages.editMessage);
  const regenerateMutation = useMutation(api.messages.regenerateResponse);
  const switchBranchMutation = useMutation(api.messages.switchBranch);

  const editMessage = async (messageId: string, newContent: string) => {
    return editMessageMutation({ messageId, newContent });
  };

  const regenerateResponse = async (messageId: string, modelId?: string) => {
    return regenerateMutation({ messageId, modelId });
  };

  const switchBranch = async (branchMessageId: string) => {
    return switchBranchMutation({ branchMessageId });
  };

  return {
    editMessage,
    regenerateResponse,
    switchBranch,
  };
}
```

---

## Testing

### Unit Tests

```typescript
describe('MessageRepository', () => {
  describe('insert', () => {
    it('should insert message with correct tree structure', async () => {
      const convId = await createTestConversation();
      const parentId = await createTestMessage(convId, 'parent');

      const repo = new MessageRepository();
      const messageId = await repo.insert(ctx, {
        content: 'Child message',
        role: 'assistant',
        conversationId: convId,
        parentId,
      });

      const [message, parent] = await Promise.all([
        ctx.db.get(messageId),
        ctx.db.get(parentId),
      ]);

      expect(message.parentMessageIds).toEqual([parentId]);
      expect(parent.childMessageIds).toContain(messageId);
      expect(message.treePosition).toBeGreaterThan(parent.treePosition);
    });
  });

  describe('createBranch', () => {
    it('should create branch with zero duplication', async () => {
      const originalId = await createTestMessage('Original');

      const repo = new MessageRepository();
      const { branchedId } = await repo.createBranch(ctx, {
        fromMessageId: originalId,
        newContent: 'Edited',
        forkReason: 'user_edit',
        userId: testUserId,
      });

      const [original, branch] = await Promise.all([
        ctx.db.get(originalId),
        ctx.db.get(branchedId),
      ]);

      expect(original.childMessageIds).toContain(branchedId);
      expect(branch.parentMessageIds).toEqual([originalId]);
      expect(branch.forkMetadata.originalContent).toBe('Original');
    });

    it('should deactivate old branches on new branch', async () => {
      const parentId = await createTestMessage('Parent');

      const repo = new MessageRepository();

      const { branchedId: branch1 } = await repo.createBranch(ctx, {
        fromMessageId: parentId,
        newContent: 'Branch 1',
        forkReason: 'user_edit',
        userId: testUserId,
      });

      const { branchedId: branch2 } = await repo.createBranch(ctx, {
        fromMessageId: parentId,
        newContent: 'Branch 2',
        forkReason: 'user_edit',
        userId: testUserId,
      });

      const [b1, b2] = await Promise.all([
        ctx.db.get(branch1),
        ctx.db.get(branch2),
      ]);

      expect(b1.isActive).toBe(false);
      expect(b2.isActive).toBe(true);
    });
  });

  describe('getPath', () => {
    it('should return full path from root', async () => {
      const convId = await createTestConversation();

      const repo = new MessageRepository();
      const msg1 = await repo.insert(ctx, { content: 'M1', role: 'user', conversationId: convId });
      const msg2 = await repo.insert(ctx, { content: 'M2', role: 'assistant', conversationId: convId, parentId: msg1 });
      const msg3 = await repo.insert(ctx, { content: 'M3', role: 'user', conversationId: convId, parentId: msg2 });

      const path = await repo.getPath(ctx, msg3);

      expect(path).toHaveLength(3);
      expect(path[0]._id).toBe(msg1);
      expect(path[1]._id).toBe(msg2);
      expect(path[2]._id).toBe(msg3);
    });
  });
});
```

---

## Expected Results

### Performance

| Operation | Before | After | Notes |
|-----------|--------|-------|-------|
| Insert message | ~4.5ms | ~5.8ms | +1.3ms for tree linking |
| Create branch | ~45ms (10 msg copy) | ~6ms | 86% faster |
| Get path | N/A | O(depth) | New capability |

### Feature Enablement

| Feature | Before | After |
|---------|--------|-------|
| Edit message | Not possible | Branching |
| Regenerate | Copy conversation | Add sibling |
| Switch branches | Not possible | Instant |
| View history | Linear only | Full tree |

---

## Risk Assessment

- **Risk Level**: MEDIUM
- **Breaking Changes**: New schema fields (backwards compatible)
- **Performance Impact**: +1.3ms per insert (acceptable)
- **Testing Required**: High (critical path)
- **Rollback**: Can fall back to flat reads if needed

---

## References

- **Sources**: kimi/05-architecture/02-message-insertion.md, kimi/05-architecture/03-branch-creation.md
- **Related Issues**: P7-architecture/01-tree-schema.md (prerequisite), P7-architecture/03-branch-comparison.md
