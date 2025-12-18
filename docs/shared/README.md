# Shared Conversations Feature - Implementation Guide

**Last Updated**: December 2024
**Feature Status**: Planning Complete, Ready for Implementation

---

## Overview

This directory contains comprehensive, self-contained guides for implementing the **Shared Conversations** feature in blah.chat. Each phase document is standalone - a developer can pick up any phase and execute it with full context.

**Feature Summary**: Enable users viewing shared conversations to either:
1. **Continue Privately** - Fork conversation into their own account (private copy)
2. **Continue with Creator** - Create a collaborative conversation where both users can participate

---

## Why This Feature?

Currently, when users share a conversation via `/share/[shareId]`, viewers can only read. This feature adds the ability to:

- **Fork privately**: User gets their own copy to continue the conversation alone
- **Collaborate**: Both original creator and new user can send messages in a shared space
- **Stay notified**: Original creator gets in-app notification when someone joins
- **Organize**: Sidebar shows visual indicator for collaborative conversations

**Reference**: ChatGPT launched "Group Chats" in November 2025 - this feature is similar but focused on 1:1 collaboration from shared links.

---

## Architecture Decision

### Why a New Participants Table?

The current `conversations` table has a single `userId` field (owner). For collaboration, we need:

```
Option A: Array of participants in conversation document
Option B: Separate conversationParticipants junction table ✅ CHOSEN
```

**We chose Option B** because:
1. **Normalized schema** - follows blah.chat CLAUDE.md guidelines
2. **Queryable relationships** - can query "all conversations I'm a participant in"
3. **Extensible** - can add role, invitedBy, sourceShareId metadata
4. **No document bloat** - conversation documents stay small
5. **Atomic updates** - add/remove participants without touching conversation

### Notification System

Built as a **global, reusable system** (not specific to shared conversations):

- `notifications` table with `type`, `title`, `message`, `data`
- Bell icon in header with red badge for unread count
- Convex reactive queries for real-time updates
- Daily cron job cleans up notifications older than 30 days

### Message Ownership: Direct Attribution (Requester Pays)

**Key Question**: When multiple users can send messages, who "owns" each message?

**Answer**: The existing `messages.userId` field works perfectly - no schema change needed:

| Message Type | userId Value | Cost Attribution |
|--------------|--------------|------------------|
| User message | Sender's userId | N/A (no cost) |
| Assistant message | Triggering user's userId | Charged to triggering user |

**Why this works**:
1. **No schema change needed** - `userId` already exists on messages
2. **Clear accountability** - whoever triggers AI response pays for it
3. **Simple implementation** - just ensure correct userId when creating messages
4. **Matches industry standard** - Poe, ChatGPT use similar models

**Implementation**:
- Historical messages: Preserve original `userId` when forking
- New messages: Use actual sender's `userId`
- Cost: Follows `userId` (already implemented in usage tracking)

---

## Phase Structure

Each phase is designed to be **executed sequentially** but **documented independently**. Every phase file contains:

- **Full Feature Context**: What shared conversations is, why we're building it
- **Phase Goals**: What will be achieved in this specific phase
- **Dependencies**: What phases must be completed first
- **Prerequisites**: What needs to be in place
- **Step-by-Step Implementation**: Detailed instructions with code
- **Testing Checklist**: How to verify success
- **Next Phase Preview**: What comes after

---

## Implementation Phases

### **Phase 1: Schema Changes** (`phase-1-schema.md`)
**Duration**: 30-45 minutes
**Dependencies**: None (can start immediately)

**What You'll Do**:
- Add `conversationParticipants` table to schema
- Add `isCollaborative` field to conversations table
- Add `notifications` table
- Run migration

**Deliverables**:
- Schema updated and deployed
- All indexes created
- Existing functionality unaffected

---

### **Phase 2: Notification Backend** (`phase-2-notification-backend.md`)
**Duration**: 1-2 hours
**Dependencies**: Phase 1 (schema)

**What You'll Do**:
- Create `convex/notifications.ts` with queries and mutations
- Add cron job for 30-day cleanup
- Create internal mutation for programmatic notification creation

**Deliverables**:
- `getUnreadCount` query
- `list` query (paginated)
- `markRead`, `markAllRead`, `dismiss` mutations
- `cleanupOld` cron job

---

### **Phase 3: Fork Mutations** (`phase-3-fork-mutations.md`)
**Duration**: 2-3 hours
**Dependencies**: Phase 1 (schema), Phase 2 (notifications)

**What You'll Do**:
- Add `forkPrivate` mutation to shares.ts
- Add `forkCollaborative` mutation to shares.ts
- Copy messages and attachments correctly
- Create notification on collaborative fork

**Deliverables**:
- `api.shares.forkPrivate` - creates private copy
- `api.shares.forkCollaborative` - creates collaborative conversation + notifies creator

---

### **Phase 4: Conversation Access** (`phase-4-conversation-access.md`)
**Duration**: 1-2 hours
**Dependencies**: Phase 1 (schema)

**What You'll Do**:
- Update `conversations.list` to include collaborative conversations
- Update `conversations.get` for participant access
- Update message sending for multi-user support

**Deliverables**:
- Collaborative conversations appear in both users' sidebars
- Both participants can access conversation
- Both participants can send messages

---

### **Phase 5: Share Page UI** (`phase-5-share-page-ui.md`)
**Duration**: 1-2 hours
**Dependencies**: Phase 3 (fork mutations)

**What You'll Do**:
- Add "Continue Privately" button
- Add "Continue with Creator" button
- Handle authentication redirects
- Show loading states during fork

**Deliverables**:
- Two buttons visible when viewing shared conversation (signed in)
- Sign-in redirect for unauthenticated users
- Fork executes and redirects to new conversation

---

### **Phase 5b: Message Attribution UI** (included in phase-4-conversation-access.md)
**Duration**: 30-45 minutes
**Dependencies**: Phase 4 (conversation access)

**What You'll Do**:
- Add `listWithUsers` query to fetch sender info with messages
- Update `ChatMessage.tsx` to show sender name/avatar in collaborative mode
- Show "Triggered by: [name]" on assistant messages

**Deliverables**:
- User messages show sender avatar + name in collaborative conversations
- Assistant messages show who triggered them
- Non-collaborative conversations unchanged (no extra UI)

---

### **Phase 6: Notification UI** (`phase-6-notification-ui.md`)
**Duration**: 1-2 hours
**Dependencies**: Phase 2 (notification backend)

**What You'll Do**:
- Create `NotificationBell` component
- Add to app header (opposite sidebar toggle)
- Implement popover with notification list
- Add mark as read / dismiss actions

**Deliverables**:
- Bell icon in header with red badge
- Popover shows recent notifications
- Click notification navigates to conversation
- Mark as read / dismiss working

---

### **Phase 7: Sidebar Indicator** (`phase-7-sidebar-indicator.md`)
**Duration**: 30 minutes
**Dependencies**: Phase 1 (schema)

**What You'll Do**:
- Add Users icon to ConversationItem for collaborative conversations
- Follow existing indicator patterns (Branch, Project, Star, Pin)

**Deliverables**:
- Blue Users icon visible for collaborative conversations
- Tooltip: "Collaborative conversation"

---

## Development Workflow

### Recommended Sequence

1. **Phase 1** - Schema (foundation for everything)
2. **Phase 2** - Notification backend (needed for fork)
3. **Phase 4** - Conversation access (can run parallel with Phase 2)
4. **Phase 3** - Fork mutations (needs Phase 1 + 2)
5. **Phase 7** - Sidebar indicator (can run after Phase 1)
6. **Phase 5** - Share page UI (needs Phase 3)
7. **Phase 6** - Notification UI (needs Phase 2)

### Parallel Execution Opportunities

```
Phase 1 ──────────┬──────> Phase 2 ──────> Phase 3 ──────> Phase 5
                  │
                  ├──────> Phase 4
                  │
                  └──────> Phase 7

Phase 2 ──────────────────────────────────────────────────> Phase 6
```

**Maximum parallelism**: After Phase 1, run Phase 2/4/7 in parallel. After Phase 2, start Phase 6. After Phase 2 completes, start Phase 3. After Phase 3, start Phase 5.

---

## Files Modified/Created

### Backend (Convex)
| File | Phase | Action |
|------|-------|--------|
| `convex/schema.ts` | 1 | Modify - add 2 tables + 1 field |
| `convex/notifications.ts` | 2 | Create - full CRUD + cron |
| `convex/crons.ts` | 2 | Modify - add notification cleanup |
| `convex/shares.ts` | 3 | Modify - add fork mutations |
| `convex/conversations.ts` | 4 | Modify - update queries |
| `convex/messages.ts` | 4 | Modify - multi-user support |

### Frontend
| File | Phase | Action |
|------|-------|--------|
| `src/app/share/[shareId]/page.tsx` | 5 | Modify - add buttons |
| `src/components/notifications/NotificationBell.tsx` | 6 | Create |
| `src/components/sidebar/ConversationItem.tsx` | 7 | Modify - add indicator |
| App header component | 6 | Modify - add bell |

---

## Testing Strategy

### Unit Tests
- Fork mutations create correct data
- Notification queries return expected results
- Conversation access checks work correctly

### Integration Tests
- Full flow: view share → fork → use conversation
- Notification appears for creator
- Both users can send messages in collaborative

### Manual Testing Checklist
- [ ] Fork privately creates new conversation
- [ ] Fork collaborative creates shared conversation
- [ ] Original conversation untouched
- [ ] Notification appears immediately (Convex reactive)
- [ ] Both users see conversation in sidebar
- [ ] Both users can send messages
- [ ] Bell icon shows unread count
- [ ] Click notification navigates correctly
- [ ] Sidebar shows Users icon for collaborative

---

## Edge Cases

1. **User forks own conversation** → Error: "Cannot collaborate with yourself"
2. **Share expired** → Error message, no buttons
3. **User clicks both buttons rapidly** → Disable both while processing
4. **Original creator deletes account** → Collaborator becomes sole owner
5. **Multiple users join via same share** → Each creates separate 1:1 collaborative

---

## Success Criteria

### Phase 1-3 Complete (Backend)
- [ ] Schema deployed
- [ ] Notifications working
- [ ] Fork mutations working

### Phase 4-7 Complete (Full Feature)
- [ ] Fork privately works end-to-end
- [ ] Fork collaborative works end-to-end
- [ ] Notifications appear and are actionable
- [ ] Sidebar shows collaborative indicator
- [ ] Both users can participate in collaborative conversation

---

## Resources

### Existing Patterns
- `convex/import.ts` - Similar conversation copying pattern
- `src/components/sidebar/ConversationItem.tsx` - Existing indicators
- `docs/mobile/` - Self-contained phase documentation style

### Reference
- ChatGPT Group Chats (Nov 2025) - Similar feature
- Convex junction tables - Schema normalization pattern

---

## Next Steps

1. **Read Phase 1** (`phase-1-schema.md`)
2. **Deploy schema changes**
3. **Continue to Phase 2**

Good luck!
