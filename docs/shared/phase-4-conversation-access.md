# Phase 4: Conversation Access

**Duration**: 1-2 hours
**Dependencies**: Phase 1 (Schema)
**Parallel Work**: Can run alongside Phase 2 and Phase 7

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why This Phase?

After collaborative conversations are created (Phase 3), both users need to:
- See the conversation in their sidebar
- Access the conversation in the chat view
- Send messages to the conversation

This phase updates queries and mutations to check `conversationParticipants` for access.

---

## Current State

### Existing Access Pattern

```typescript
// Current: Only owner can access
const conversation = await ctx.db.get(conversationId);
if (conversation.userId !== user._id) {
  throw new Error("Unauthorized");
}
```

### From Phase 1

- `conversationParticipants` table exists with indexes
- `isCollaborative` field on conversations

---

## Phase Goals

By the end of this phase:
1. ✅ Collaborative conversations appear in both users' sidebars
2. ✅ Both participants can access conversation
3. ✅ Both participants can send messages
4. ✅ Existing single-user conversations work unchanged

---

## Prerequisites

- [ ] Phase 1 complete (schema)
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Create Access Helper Function

Add to `convex/conversations.ts`:

```typescript
/**
 * Check if user can access a conversation
 * Returns true if user is owner OR participant
 */
async function canAccessConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">
): Promise<boolean> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return false;

  // Owner always has access
  if (conversation.userId === userId) return true;

  // Check participant table for collaborative conversations
  if (conversation.isCollaborative) {
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", userId).eq("conversationId", conversationId)
      )
      .first();

    return participant !== null;
  }

  return false;
}
```

### Step 2: Update `list` Query

Find the `list` query in `convex/conversations.ts` and update it:

```typescript
/**
 * List all conversations for current user
 * Includes owned conversations AND collaborative conversations
 */
export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    archived: v.optional(v.boolean()),
    starred: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // 1. Get owned conversations
    let ownedQuery = ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const owned = await ownedQuery.collect();

    // 2. Get collaborative conversations where user is participant
    const participations = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // 3. Fetch collaborative conversations
    const collabConversations = await Promise.all(
      participations.map((p) => ctx.db.get(p.conversationId))
    );

    // 4. Merge and dedupe (owner might also be participant)
    const allConversations = [...owned];
    for (const collab of collabConversations) {
      if (collab && !allConversations.find((c) => c._id === collab._id)) {
        allConversations.push(collab);
      }
    }

    // 5. Apply filters
    let filtered = allConversations;

    if (args.projectId !== undefined) {
      filtered = filtered.filter((c) => c.projectId === args.projectId);
    }

    if (args.archived !== undefined) {
      filtered = filtered.filter((c) => (c.archived ?? false) === args.archived);
    }

    if (args.starred !== undefined) {
      filtered = filtered.filter((c) => (c.starred ?? false) === args.starred);
    }

    // 6. Sort by lastMessageAt (most recent first)
    filtered.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

    return filtered;
  },
});
```

### Step 3: Update `get` Query

Update the `get` query to check participants:

```typescript
/**
 * Get a single conversation
 * Returns null if user doesn't have access
 */
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Check access
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id
    );

    if (!hasAccess) return null;

    return conversation;
  },
});
```

### Step 4: Update Message Sending

Find the message sending mutation (likely `sendMessage` or similar in `convex/messages.ts` or `convex/chat.ts`):

```typescript
/**
 * Send a message to a conversation
 * Both owner and participants can send messages
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check conversation access
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user can access (owner or participant)
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id
    );

    if (!hasAccess) {
      throw new Error("You don't have access to this conversation");
    }

    // Create message with current user as author
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id, // Message attributed to sender
      content: args.content,
      role: "user",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update conversation lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });

    return messageId;
  },
});
```

### Step 5: Update Other Conversation Operations

Update any other mutations that check conversation ownership:

#### Update Conversation

```typescript
export const update = mutation({
  args: {
    conversationId: v.id("conversations"),
    // ... update fields
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // For updates, might want to restrict to owner only
    // Or allow any participant - depends on your UX needs
    if (conversation.userId !== user._id) {
      // Check if participant for collaborative
      if (conversation.isCollaborative) {
        const participant = await ctx.db
          .query("conversationParticipants")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", user._id).eq("conversationId", args.conversationId)
          )
          .first();

        if (!participant) {
          throw new Error("You don't have access to this conversation");
        }

        // Participants can update some things, not others
        // Example: Allow title change but not delete
        // Customize based on your needs
      } else {
        throw new Error("You don't own this conversation");
      }
    }

    // Proceed with update...
  },
});
```

#### Delete Conversation

```typescript
export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Only owner can delete
    if (conversation.userId !== user._id) {
      throw new Error("Only the owner can delete this conversation");
    }

    // Delete participants first (if collaborative)
    if (conversation.isCollaborative) {
      const participants = await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .collect();

      for (const p of participants) {
        await ctx.db.delete(p._id);
      }
    }

    // Delete messages, attachments, then conversation...
  },
});
```

### Step 6: Add Participants Query (Optional but Useful)

Add a query to get participants for a conversation:

```typescript
/**
 * Get all participants for a conversation
 * Useful for showing who's in a collaborative conversation
 */
export const getParticipants = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check access first
    const hasAccess = await canAccessConversation(
      ctx,
      args.conversationId,
      user._id
    );

    if (!hasAccess) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.isCollaborative) return [];

    // Get participants
    const participants = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Fetch user details
    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const participantUser = await ctx.db.get(p.userId);
        return {
          ...p,
          user: participantUser
            ? {
                _id: participantUser._id,
                name: participantUser.name,
                email: participantUser.email,
                imageUrl: participantUser.imageUrl,
              }
            : null,
        };
      })
    );

    return participantsWithUsers;
  },
});
```

### Step 7: Message Attribution UI (Phase 5b)

For collaborative conversations, users need to see who sent each message. Add a query that returns messages with sender info:

**File**: `convex/messages.ts`

```typescript
/**
 * List messages with sender user info (for collaborative conversations)
 */
export const listWithUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Check access
    const hasAccess = await canAccessConversation(ctx, args.conversationId, user._id);
    if (!hasAccess) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Fetch user info for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const senderUser = msg.userId ? await ctx.db.get(msg.userId) : null;
        return {
          ...msg,
          senderUser: senderUser
            ? { name: senderUser.name, imageUrl: senderUser.imageUrl }
            : null,
        };
      })
    );

    return messagesWithUsers;
  },
});
```

**Frontend Changes** (`src/components/chat/ChatMessage.tsx`):

```tsx
// Add props for collaborative mode
interface ChatMessageProps {
  message: Message;
  isCollaborative?: boolean;
  senderUser?: { name?: string; imageUrl?: string } | null;
}

// Show sender info for user messages in collaborative conversations
{isCollaborative && message.role === "user" && (
  <div className="flex items-center gap-2 mb-1">
    <Avatar className="h-5 w-5">
      <AvatarImage src={senderUser?.imageUrl} />
      <AvatarFallback>{senderUser?.name?.[0] || "?"}</AvatarFallback>
    </Avatar>
    <span className="text-xs text-muted-foreground">
      {senderUser?.name || "Unknown"}
    </span>
  </div>
)}

// Show who triggered assistant messages
{isCollaborative && message.role === "assistant" && (
  <div className="text-xs text-muted-foreground mb-1">
    Triggered by {senderUser?.name || "Unknown"}
  </div>
)}
```

**Key Points**:
- Only show user attribution in collaborative conversations (not single-user)
- Use existing `userId` field on messages - no schema change needed
- Cost attribution follows userId (requester pays model)

---

## Testing Checklist

### Conversation List Tests

1. **As original owner**:
   - [ ] Own conversations appear in list
   - [ ] Collaborative conversations appear
   - [ ] Filters work (archived, starred, projectId)

2. **As collaborator**:
   - [ ] Collaborative conversations appear in list
   - [ ] Cannot see owner's other conversations
   - [ ] Sorted by lastMessageAt correctly

### Conversation Access Tests

1. **Get conversation**:
   - [ ] Owner can get own conversation
   - [ ] Collaborator can get collaborative conversation
   - [ ] Non-participant gets null

2. **Send message**:
   - [ ] Owner can send message
   - [ ] Collaborator can send message
   - [ ] Message attributed to sender
   - [ ] lastMessageAt updated

3. **Update conversation**:
   - [ ] Owner can update
   - [ ] Collaborator access per your rules
   - [ ] Non-participant cannot update

4. **Delete conversation**:
   - [ ] Only owner can delete
   - [ ] Participants removed on delete
   - [ ] Collaborator cannot delete

### Message Attribution Tests (Phase 5b)

- [ ] User messages show sender avatar + name in collaborative mode
- [ ] Assistant messages show "Triggered by: [name]"
- [ ] Non-collaborative conversations show no user attribution
- [ ] Cost charged to user who sent triggering message
- [ ] Usage dashboard shows correct per-user costs

### Edge Cases

- [ ] User who is both owner and participant (dedupe works)
- [ ] Collaborative conversation with one participant removed
- [ ] Conversation deleted while collaborator viewing

---

## Permission Matrix

| Action | Owner | Collaborator | Non-Participant |
|--------|-------|--------------|-----------------|
| View in list | ✅ | ✅ | ❌ |
| Get conversation | ✅ | ✅ | ❌ |
| Send message | ✅ | ✅ | ❌ |
| Edit title | ✅ | ⚙️ Configurable | ❌ |
| Star/Pin | ✅ | ⚙️ Configurable | ❌ |
| Archive | ✅ | ⚙️ Configurable | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Add participant | ✅ | ❌ | ❌ |

---

## Troubleshooting

### Collaborative conversations not appearing in list

**Cause**: Missing participant record

**Solution**:
1. Check `conversationParticipants` table for user's record
2. Verify `by_user` index is working
3. Check `isCollaborative` is `true` on conversation

### "You don't have access" error

**Cause**: canAccessConversation returning false

**Solution**:
1. Log the userId and conversationId
2. Check if participant record exists
3. Verify conversation.isCollaborative is true

### Messages not attributed correctly

**Cause**: Using wrong userId when creating message

**Solution**: Always use `user._id` (current user) for new messages

### Duplicate conversations in list

**Cause**: Owner also in participants table

**Solution**: The dedupe logic should handle this. Check the find() logic.

---

## Next Phases

After completing Phase 4, the following phases can proceed:

- **Phase 5**: Share Page UI (needs conversation access working)
- **Phase 7**: Sidebar Indicator (can display collaborative indicator)

---

## Summary

This phase enables multi-user conversation access:

| Update | Purpose |
|--------|---------|
| `canAccessConversation` helper | Centralized access check |
| `list` query | Include collaborative conversations |
| `get` query | Check participant access |
| `sendMessage` | Both users can send |
| Other mutations | Owner-only for destructive actions |

**Key principle**: Owner OR participant can access collaborative conversations. Only owner can delete.

**Total time**: 1-2 hours (including testing)

**Next**: Proceed to Phase 5 (Share Page UI) or Phase 7 (Sidebar Indicator)
