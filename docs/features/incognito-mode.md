# Incognito Mode

## Why This Feature Exists

Users sometimes want conversations that don't persist. Maybe they're discussing something sensitive, testing how the AI behaves without their customizations, or just want a "throwaway" chat. Browser incognito mode and DuckDuckGo's "fire button" set user expectations here.

The core promise: **what happens in incognito stays in incognito**. No memories saved, no traces left, auto-cleanup.

---

## Key Decisions

### Hard Delete, Not Soft Delete

We considered soft-deleting incognito conversations (marking as deleted but keeping data). Rejected because it violates the core promise. If a user chooses incognito, they expect the data to be gone. Period.

The cascade delete removes everything: messages, bookmarks, shares, file associations, memory associations, project links, and the conversation itself.

### Three-Layer Deletion

We don't trust any single deletion mechanism:

1. **Fire button**: User-triggered immediate wipe
2. **Inactivity timer**: Configurable (15/30/60 min or manual)
3. **24h cron**: Hourly cleanup catches anything missed

Why all three? The inactivity timer relies on the Convex scheduler. If that fails or the conversation was created without a timeout, the cron catches it. Belt and suspenders.

### Configurable Read Tools

Initially we blocked all tools in incognito. Users complained - they wanted to ask about their notes/files while still having the conversation be ephemeral.

So we made read tools (search notes, files, tasks) configurable. Write tools (save memory, manage tasks) are always blocked. This lets users choose their privacy level:
- Full isolation: disable read tools
- Contextual but ephemeral: enable read tools

### Blank Slate Mode

"Custom instructions" toggle controls whether the AI gets the user's personalization (custom system prompt, identity memories). When disabled, it's a vanilla AI experience.

Use case: testing how the AI responds without your customizations, or having a conversation where you don't want your preferences influencing responses.

### Why Not Project Support

Incognito conversations can't be added to projects. This was intentional:
- Projects imply organization and persistence
- Incognito implies ephemeral and disposable
- Mixing them creates confusing UX ("this conversation will be deleted but it's in my project?")

We hide the ProjectSelector entirely in incognito rather than showing it disabled.

---

## UI Design Thinking

### Violet Color Theme

Incognito uses violet (not the app's primary color) to be visually distinct. Users should immediately recognize "this is different." Inspired by how browsers show dark/purple themes for incognito windows.

### Fire Button Placement

The fire button replaces the share button in incognito. Same position, opposite function. Share = persist and distribute. Fire = destroy immediately.

Orange flame color was chosen for urgency/danger without being alarming red.

### Header Button (Sidebar Closed)

When sidebar is collapsed, users need quick access to start incognito chats. On desktop, it's an icon button alongside New Chat and Search. On mobile, it's in a dropdown menu to reduce button clutter.

The ghost icon is consistent everywhere (sidebar, header, dialog, badge).

---

## Things That Might Not Be Obvious

### Activity Tracking

Every message resets the inactivity timer. This happens via `recordActivity()` called during message creation. The timer only counts from the *last* message, not from conversation creation.

### Scheduler IDs

We store `scheduledDeletionId` to cancel previous timers when rescheduling. Without this, multiple timers could stack up and cause unexpected deletions.

### Memory Extraction Still Runs

The memory extraction pipeline still analyzes incognito conversations (for the AI to use in-context). It just doesn't *persist* extracted memories. The `conversationId` on any accidentally-saved memories gets nullified on deletion.

### Files Aren't Deleted

Files uploaded during incognito are kept (their `conversationId` is nullified). Rationale: files might be reused elsewhere, and users explicitly uploaded them. Only the *association* is ephemeral.

---

## Known Limitations

### No Recovery

Once deleted (fire button or timer), data is gone. No undo, no recycle bin. This is by design but users occasionally complain.

### Timer Not Visible

Users can't see how much time remains before auto-delete. We decided against a countdown to avoid adding anxiety. The timer duration is shown at creation time.

### No Conversion

Can't convert a normal conversation to incognito or vice versa. Would require retroactive memory deletion (complex) and changing user expectations mid-conversation (confusing).

---

## Future Considerations

**Session countdown**: Some users want to see remaining time. Could add an optional indicator.

**Per-message expiration**: More granular than conversation-level. Significantly more complex (each message needs its own timer).

**Encrypted storage**: True E2E encryption where even we can't read incognito content. Major infrastructure change.

**Extend timeout**: "Give me 30 more minutes" button. Would need UI for timer management.

---

## Files Involved

The feature spans:
- Schema: `isIncognito`, `incognitoSettings` on conversations table
- Backend: `convex/incognito.ts` (deletion), `convex/generation.ts` (tool filtering)
- Cron: `convex/crons.ts` (24h cleanup)
- UI: Components in `src/components/chat/` (NewIncognitoDialog, IncognitoBadge, FireButton)
- Layout: `src/app/(main)/layout.tsx` (header button), `src/components/chat/ChatHeader.tsx` (conditional elements)
