# Phase 3: Fork Mutations

**Duration**: 2-3 hours
**Dependencies**: Phase 1 (Schema), Phase 2 (Notifications)
**Next**: Phase 5 (Share Page UI)

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why This Phase?

This phase implements the core fork logic:
- `forkPrivate`: Copy conversation + messages to user's account (private)
- `forkCollaborative`: Create shared conversation, add both users as participants, notify creator

---

## Current State

### From Phase 1 & 2

- `conversationParticipants` table exists
- `notifications` table exists
- `isCollaborative` field on conversations
- `internal.notifications.create` mutation available

### Existing Code Reference

The `convex/import.ts` file has similar conversation copying logic:

```typescript
// From import.ts - pattern to follow
const conversationId = await ctx.db.insert("conversations", {
  userId: user._id,
  title: conversation.title || `Imported Chat ${i + 1}`,
  // ... fields
});

for (const message of conversation.messages) {
  await ctx.db.insert("messages", {
    conversationId,
    userId: user._id,
    // ... message fields
  });
}
```

---

## Phase Goals

By the end of this phase:
1. ✅ `forkPrivate` mutation creates private copy
2. ✅ `forkCollaborative` mutation creates shared conversation
3. ✅ Messages and attachments copied correctly
4. ✅ Creator notified on collaborative fork
5. ✅ Cannot collaborate with yourself check

---

## Prerequisites

- [ ] Phase 1 complete (schema)
- [ ] Phase 2 complete (notifications)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Open Shares File

**File**: `convex/shares.ts`

### Step 2: Add Imports

Add these imports at the top of the file:

```typescript
import { internal } from "./_generated/api";
```

### Step 3: Implement `forkPrivate` Mutation

Add this mutation to `convex/shares.ts`:

```typescript
/**
 * Fork a shared conversation privately
 * Creates a complete copy in the user's account
 * Original conversation untouched
 */
export const forkPrivate = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get current user
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // 2. Get share and validate
    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share) {
      throw new Error("Share not found");
    }
    if (!share.isActive) {
      throw new Error("Share is no longer active");
    }
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // 3. Handle based on entity type
    if (share.entityType === "note") {
      throw new Error("Use forkNote for notes");
    }

    // 4. Get original conversation
    const original = await ctx.db.get(share.conversationId!);
    if (!original) {
      throw new Error("Original conversation not found");
    }

    // 5. Get all messages from original
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", share.conversationId!)
      )
      .collect();

    // 6. Create new private conversation
    const newConversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: `${original.title} (continued)`,
      model: original.model,
      systemPrompt: original.systemPrompt,
      temperature: original.temperature,
      maxTokens: original.maxTokens,
      thinkingEffort: original.thinkingEffort,
      isCollaborative: false,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: messages.length,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Copy messages with attachments
    for (const msg of messages) {
      const newMessageId = await ctx.db.insert("messages", {
        conversationId: newConversationId,
        userId: user._id, // New user owns copied messages
        role: msg.role,
        content: msg.content,
        status: "complete",
        model: msg.model,
        reasoning: msg.reasoning,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        cost: msg.cost,
        createdAt: msg.createdAt,
        updatedAt: Date.now(),
      });

      // Copy attachments
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      for (const att of attachments) {
        await ctx.db.insert("attachments", {
          messageId: newMessageId,
          userId: user._id,
          storageId: att.storageId, // Reference same storage (no duplicate files)
          name: att.name,
          type: att.type,
          mimeType: att.mimeType,
          size: att.size,
          width: att.width,
          height: att.height,
          createdAt: Date.now(),
        });
      }
    }

    // 8. Increment share view count (optional tracking)
    await ctx.db.patch(share._id, {
      viewCount: (share.viewCount || 0) + 1,
    });

    return newConversationId;
  },
});
```

### Step 4: Implement `forkCollaborative` Mutation

Add this mutation to `convex/shares.ts`:

```typescript
/**
 * Fork a shared conversation collaboratively
 * Creates a new conversation where both original owner and new user can participate
 * Notifies the original owner
 */
export const forkCollaborative = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    // 1. Get current user
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // 2. Get share and validate
    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share) {
      throw new Error("Share not found");
    }
    if (!share.isActive) {
      throw new Error("Share is no longer active");
    }
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    // 3. Handle based on entity type
    if (share.entityType === "note") {
      throw new Error("Notes do not support collaborative mode");
    }

    // 4. Get original conversation and owner
    const original = await ctx.db.get(share.conversationId!);
    if (!original) {
      throw new Error("Original conversation not found");
    }

    const originalOwner = await ctx.db.get(original.userId);
    if (!originalOwner) {
      throw new Error("Original owner not found");
    }

    // 5. Prevent collaborating with yourself
    if (original.userId === user._id) {
      throw new Error("Cannot collaborate with yourself");
    }

    // 6. Get all messages from original
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", share.conversationId!)
      )
      .collect();

    // 7. Create collaborative conversation
    const collabConversationId = await ctx.db.insert("conversations", {
      userId: original.userId, // Original owner remains primary owner
      title: `${original.title} (shared)`,
      model: original.model,
      systemPrompt: original.systemPrompt,
      temperature: original.temperature,
      maxTokens: original.maxTokens,
      thinkingEffort: original.thinkingEffort,
      isCollaborative: true, // Mark as collaborative
      pinned: false,
      archived: false,
      starred: false,
      messageCount: messages.length,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 8. Add both users as participants
    // Original owner
    await ctx.db.insert("conversationParticipants", {
      conversationId: collabConversationId,
      userId: original.userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    // New collaborator
    await ctx.db.insert("conversationParticipants", {
      conversationId: collabConversationId,
      userId: user._id,
      role: "collaborator",
      joinedAt: Date.now(),
      invitedBy: original.userId,
      sourceShareId: args.shareId,
    });

    // 9. Copy messages (preserve original userId for attribution)
    for (const msg of messages) {
      const newMessageId = await ctx.db.insert("messages", {
        conversationId: collabConversationId,
        userId: msg.userId, // Keep original author for attribution
        role: msg.role,
        content: msg.content,
        status: "complete",
        model: msg.model,
        reasoning: msg.reasoning,
        inputTokens: msg.inputTokens,
        outputTokens: msg.outputTokens,
        cost: msg.cost,
        createdAt: msg.createdAt,
        updatedAt: Date.now(),
      });

      // Copy attachments
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      for (const att of attachments) {
        await ctx.db.insert("attachments", {
          messageId: newMessageId,
          userId: att.userId, // Keep original uploader
          storageId: att.storageId,
          name: att.name,
          type: att.type,
          mimeType: att.mimeType,
          size: att.size,
          width: att.width,
          height: att.height,
          createdAt: Date.now(),
        });
      }
    }

    // 10. Create notification for original owner
    await ((ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
      internal.notifications.create,
      {
        userId: original.userId,
        type: "collaboration_joined",
        title: "New collaborator",
        message: `${user.name || "Someone"} joined "${original.title}"`,
        data: {
          conversationId: collabConversationId,
          joinedUserId: user._id,
          joinedUserName: user.name,
        },
      }
    ));

    // 11. Increment share view count
    await ctx.db.patch(share._id, {
      viewCount: (share.viewCount || 0) + 1,
    });

    return collabConversationId;
  },
});
```

### Step 5: Add Note Fork (Optional, Simpler)

For completeness, add a simple note fork (private only):

```typescript
/**
 * Fork a shared note to user's account
 * Notes are always private (no collaboration mode)
 */
export const forkNote = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const share = await ctx.db
      .query("shares")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!share || share.entityType !== "note") {
      throw new Error("Note share not found");
    }
    if (!share.isActive) {
      throw new Error("Share is no longer active");
    }
    if (share.expiresAt && share.expiresAt < Date.now()) {
      throw new Error("Share has expired");
    }

    const original = await ctx.db.get(share.noteId!);
    if (!original) {
      throw new Error("Original note not found");
    }

    // Create copy
    const newNoteId = await ctx.db.insert("notes", {
      userId: user._id,
      projectId: undefined, // Don't copy project association
      title: `${original.title} (saved)`,
      content: original.content,
      htmlContent: original.htmlContent,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(share._id, {
      viewCount: (share.viewCount || 0) + 1,
    });

    return newNoteId;
  },
});
```

---

## Testing Checklist

### forkPrivate Tests

1. **Setup**: Create a conversation, share it, get the shareId

2. **Test as different user**:
   - [ ] Sign in as different user
   - [ ] Call `forkPrivate({ shareId })`
   - [ ] Verify new conversation created
   - [ ] Verify title has "(continued)" suffix
   - [ ] Verify all messages copied
   - [ ] Verify `isCollaborative` is `false`
   - [ ] Verify original conversation untouched

3. **Edge cases**:
   - [ ] Invalid shareId → Error
   - [ ] Expired share → Error
   - [ ] Inactive share → Error

### forkCollaborative Tests

1. **Setup**: Same as above

2. **Test as different user**:
   - [ ] Call `forkCollaborative({ shareId })`
   - [ ] Verify new conversation created
   - [ ] Verify title has "(shared)" suffix
   - [ ] Verify `isCollaborative` is `true`
   - [ ] Verify two participants created
   - [ ] Verify notification created for original owner

3. **Edge cases**:
   - [ ] Same user as owner → "Cannot collaborate with yourself"
   - [ ] Note share → "Notes do not support collaborative mode"

### Notification Test

1. Sign in as original owner
2. Check notifications:
   - [ ] Notification appears
   - [ ] Title: "New collaborator"
   - [ ] Message: "[Name] joined [Title]"
   - [ ] Data contains conversationId

---

## API Reference

### Mutations

| Mutation | Args | Returns | Description |
|----------|------|---------|-------------|
| `forkPrivate` | `{ shareId: string }` | `Id<"conversations">` | Create private copy |
| `forkCollaborative` | `{ shareId: string }` | `Id<"conversations">` | Create shared copy + notify |
| `forkNote` | `{ shareId: string }` | `Id<"notes">` | Copy note to account |

### Errors

| Error | Cause |
|-------|-------|
| "Unauthorized" | Not signed in |
| "Share not found" | Invalid shareId |
| "Share is no longer active" | Share deactivated |
| "Share has expired" | Past expiration date |
| "Cannot collaborate with yourself" | User is original owner |
| "Notes do not support collaborative mode" | Called forkCollaborative on note |

---

## Key Differences: Private vs Collaborative

| Aspect | forkPrivate | forkCollaborative |
|--------|-------------|-------------------|
| `isCollaborative` | `false` | `true` |
| Title suffix | "(continued)" | "(shared)" |
| Message userId | Copying user | Original author |
| Participants | None (single owner) | Both users |
| Notification | None | Created for owner |
| Who can send messages | Only copying user | Both users |

---

## Troubleshooting

### "Cannot find internal.notifications.create"

**Cause**: Types not regenerated

**Solution**:
```bash
bunx convex dev
# Wait for regeneration
```

### "Type instantiation is excessively deep"

**Cause**: TypeScript depth limit with many Convex modules

**Solution**: Use the `@ts-ignore` pattern shown in the code

### Messages not copying

**Cause**: Missing index or wrong field name

**Solution**:
1. Check `by_conversation` index exists on messages
2. Verify field names match schema exactly

### Attachments not showing

**Cause**: Storage permissions or missing attachment copy

**Solution**:
1. Verify attachments table has `by_message` index
2. Check storageId is copied correctly (references same file)

---

## Next Phase

After completing Phase 3, proceed to:

- **Phase 5**: Share Page UI (add the buttons that call these mutations)

Phase 5 depends directly on the mutations created in this phase.

---

## Summary

This phase implements the core fork functionality:

| Mutation | Purpose |
|----------|---------|
| `forkPrivate` | Private copy with all messages |
| `forkCollaborative` | Shared copy with notifications |
| `forkNote` | Simple note copy |

**Key features**:
- Copies all messages and attachments
- Handles collaborative vs private correctly
- Notifies original owner on collaborative fork
- Prevents self-collaboration

**Total time**: 2-3 hours (including testing)

**Next**: Proceed to Phase 5 (Share Page UI)
