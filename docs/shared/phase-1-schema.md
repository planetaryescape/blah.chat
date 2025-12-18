# Phase 1: Schema Changes

**Duration**: 30-45 minutes
**Dependencies**: None (can start immediately)
**Parallel Work**: After this phase, Phases 2, 4, and 7 can run in parallel

---

## Feature Context

### What We're Building

**Shared Conversations** enables users viewing a shared conversation (`/share/[shareId]`) to:
1. **Continue Privately** - Fork conversation into their own account
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

### Why This Phase First

All other phases depend on the schema changes in this phase:
- Phase 2 (Notifications) needs the `notifications` table
- Phase 3 (Fork Mutations) needs `conversationParticipants` and `isCollaborative`
- Phase 4 (Conversation Access) needs `conversationParticipants`
- Phase 7 (Sidebar Indicator) needs `isCollaborative`

---

## Current State

### Existing Schema (relevant parts)

```typescript
// convex/schema.ts

conversations: defineTable({
  userId: v.id("users"),           // Single owner
  title: v.string(),
  model: v.string(),
  systemPrompt: v.optional(v.string()),
  pinned: v.optional(v.boolean()),
  archived: v.optional(v.boolean()),
  starred: v.optional(v.boolean()),
  messageCount: v.optional(v.number()),
  lastMessageAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  // ... other fields
})
```

**Problem**: Single `userId` field means only one user can own/access a conversation.

---

## Phase Goals

By the end of this phase:
1. ✅ `conversationParticipants` table exists with proper indexes
2. ✅ `conversations` table has `isCollaborative` field
3. ✅ `notifications` table exists with proper indexes
4. ✅ Schema deployed, existing functionality unaffected

---

## Prerequisites

- [ ] Convex CLI installed and authenticated
- [ ] Access to the Convex dashboard
- [ ] Development environment running (`bun dev`)

---

## Step-by-Step Implementation

### Step 1: Open Schema File

**File**: `convex/schema.ts`

### Step 2: Add `conversationParticipants` Table

Find the table definitions section and add the new table. Place it near the `conversations` table for logical grouping.

```typescript
// Add this new table definition

conversationParticipants: defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  role: v.union(v.literal("owner"), v.literal("collaborator")),
  joinedAt: v.number(),
  invitedBy: v.optional(v.id("users")),
  sourceShareId: v.optional(v.string()), // Track which share link they joined from
})
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_user_conversation", ["userId", "conversationId"]),
```

**Why these indexes**:
- `by_conversation`: Get all participants for a conversation
- `by_user`: Get all conversations a user participates in
- `by_user_conversation`: Check if specific user is participant in specific conversation

### Step 3: Add `isCollaborative` Field to Conversations

Find the `conversations` table definition and add the new field:

```typescript
conversations: defineTable({
  userId: v.id("users"),
  title: v.string(),
  model: v.string(),
  // ... existing fields ...

  // ADD THIS FIELD:
  isCollaborative: v.optional(v.boolean()), // true for multi-user conversations

  // ... rest of existing fields ...
})
```

**Why optional?**: Existing conversations will have `undefined` for this field (treated as `false`). No data migration needed.

### Step 4: Add `notifications` Table

Add the notifications table for the global notification system:

```typescript
notifications: defineTable({
  userId: v.id("users"),           // Recipient
  type: v.string(),                // e.g., "collaboration_joined", "message_received"
  title: v.string(),
  message: v.string(),
  data: v.optional(v.object({      // Type-specific payload
    conversationId: v.optional(v.id("conversations")),
    joinedUserId: v.optional(v.id("users")),
    joinedUserName: v.optional(v.string()),
    // Extensible for future notification types
  })),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"])
  .index("by_created", ["createdAt"]), // For cleanup cron
```

**Why these indexes**:
- `by_user`: Get all notifications for a user
- `by_user_unread`: Get unread notifications (for badge count)
- `by_created`: For cron job to delete old notifications

### Step 5: Full Schema Addition (Copy-Paste Ready)

Here's the complete addition to make to `convex/schema.ts`:

```typescript
// ============================================
// SHARED CONVERSATIONS FEATURE - Phase 1
// ============================================

// Junction table for multi-user conversations
conversationParticipants: defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  role: v.union(v.literal("owner"), v.literal("collaborator")),
  joinedAt: v.number(),
  invitedBy: v.optional(v.id("users")),
  sourceShareId: v.optional(v.string()),
})
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .index("by_user_conversation", ["userId", "conversationId"]),

// Global notification system
notifications: defineTable({
  userId: v.id("users"),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  data: v.optional(v.object({
    conversationId: v.optional(v.id("conversations")),
    joinedUserId: v.optional(v.id("users")),
    joinedUserName: v.optional(v.string()),
  })),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"])
  .index("by_created", ["createdAt"]),
```

And add `isCollaborative: v.optional(v.boolean()),` to the `conversations` table.

### Step 6: Deploy Schema

```bash
# Push schema changes to Convex
bunx convex dev
```

Or if using dashboard deployment:
```bash
bunx convex deploy
```

### Step 7: Verify Deployment

1. Open Convex Dashboard
2. Navigate to Data tab
3. Confirm new tables appear:
   - `conversationParticipants` (empty, 3 indexes)
   - `notifications` (empty, 3 indexes)
4. Click on `conversations` table
5. Verify schema shows `isCollaborative` field

---

## Testing Checklist

### Schema Verification
- [ ] `conversationParticipants` table exists in dashboard
- [ ] `conversationParticipants` has 3 indexes (by_conversation, by_user, by_user_conversation)
- [ ] `notifications` table exists in dashboard
- [ ] `notifications` has 3 indexes (by_user, by_user_unread, by_created)
- [ ] `conversations` table has `isCollaborative` field in schema

### Existing Functionality
- [ ] App still runs without errors
- [ ] Can create new conversations
- [ ] Can send messages
- [ ] Can view existing conversations
- [ ] Share links still work

---

## Troubleshooting

### "Schema validation failed"

**Cause**: Syntax error in schema definition

**Solution**: Check for:
- Missing commas between table definitions
- Incorrect field types
- Typos in index names

### "Index already exists"

**Cause**: Re-running migration with existing indexes

**Solution**: This is fine - Convex handles idempotent schema updates

### TypeScript errors in other files

**Cause**: Convex regenerating types, temporary issue

**Solution**:
1. Wait for `bunx convex dev` to complete
2. Restart TypeScript server in IDE
3. Run `bun run lint` to check for real issues

---

## Next Phases

After completing Phase 1, you can proceed to:

- **Phase 2**: Notification Backend (create queries/mutations for notifications)
- **Phase 4**: Conversation Access (update queries to check participants)
- **Phase 7**: Sidebar Indicator (use `isCollaborative` field)

All three can be worked on in parallel since they only depend on the schema from this phase.

---

## Code Reference

After this phase, the following types will be available:

```typescript
// Auto-generated by Convex
import type { Doc, Id } from "@/convex/_generated/dataModel";

// New document types
type ConversationParticipant = Doc<"conversationParticipants">;
type Notification = Doc<"notifications">;

// Updated conversation type now includes
interface Conversation {
  // ... existing fields
  isCollaborative?: boolean;
}
```

---

## Summary

This phase adds the foundational schema for shared conversations:

| Addition | Purpose |
|----------|---------|
| `conversationParticipants` table | Track who can access which conversations |
| `notifications` table | Global notification system |
| `isCollaborative` field | Mark conversations as shared |

**Total time**: 30-45 minutes (including verification)

**Next**: Proceed to Phase 2 (Notification Backend) or Phase 4 (Conversation Access)
