# Work Item 03: New Messages Badge When User Is Not at Bottom

## Summary
Add a clear indicator when new messages arrive while the user is reading older content. Show a counter and a jump-to-latest button.

## Problem
- The current UI shows a generic "Scroll to bottom" button when `atBottom` is false, but does not tell the user that new messages have arrived.
- Users can miss new assistant output during long scroll sessions.

## User Impact
- Users are unaware of unseen content and must manually scroll down.

## Proposed Fix
- Track unseen messages count while `atBottom` is false.
- Display a badge on the scroll-to-bottom button with the count.
- Reset the count when the user reaches bottom or clicks the button.

## Implementation Notes
- File: `apps/web/src/components/chat/VirtualizedMessageList.tsx`
- Maintain `unseenCount` state and increment on new message insertions when `atBottom === false`.
- Use grouped messages to detect new insertions; ignore edits to existing messages.

## Acceptance Criteria
- When the user is scrolled up, new assistant messages increment the badge count.
- Clicking the button scrolls to bottom and clears the count.
- If the user scrolls to bottom manually, count resets.

## Tests
- Scroll up, send a new message, confirm badge count increases.
- Scroll to bottom, confirm badge disappears and count resets.
