# Work Item 05: Draft Persistence for Chat Input

## Summary
Persist draft input and attachments in `sessionStorage` keyed by conversationId so users do not lose work when navigating or refreshing.

## Problem
- Drafts are lost on refresh or route changes.

## User Impact
- Users lose typed prompts or attachment selections.

## Proposed Fix
- Store `input`, `attachments`, and any tool toggles on change in `sessionStorage`.
- Restore on component mount.
- Clear on successful send.

## Implementation Notes
- File: `apps/web/src/components/chat/ChatInput.tsx`
- Key format: `chat-input-${conversationId}`.
- Serialize attachments minimally (storageId, name, type, size).
- Guard against incognito conversations if applicable.

## Acceptance Criteria
- Refresh mid-typing restores text and attachments.
- Switching conversations restores each draft separately.
- Draft is cleared once message is sent.

## Tests
- Type input, refresh, verify restoration.
- Attach a file, refresh, verify attachment preview.
- Send message, verify draft cleared.
