# Work Item 02: Preserve Scroll Position When Loading Older Messages

## Summary
Loading older messages at the top causes the viewport to jump because the list grows above the current scroll position. The user loses their reading position.

## Problem
- When `loadMore` prepends older messages, `scrollTop` stays fixed while `scrollHeight` increases.
- This visually shifts the current message down the screen.

## User Impact
- Users lose their place when reviewing long conversations.
- The top load sentinel can trigger repeatedly because the list stays at the top.

## Proposed Fix
- Preserve the scroll anchor when older messages are prepended.
- Capture `scrollHeight` before `loadMore` and adjust `scrollTop` by the delta afterward.
- Optionally apply CSS `overflow-anchor` on the message list container to help maintain anchor.

## Implementation Notes
- File: `apps/web/src/app/(main)/chat/[conversationId]/page.tsx` (pagination trigger)
- File: `apps/web/src/components/chat/VirtualizedMessageList.tsx` (scroll container)
- After `loadMore`, compute:
  - `const heightDelta = newScrollHeight - prevScrollHeight;`
  - `scrollTop += heightDelta;`

## Acceptance Criteria
- When older messages load, the message currently at top of the viewport stays in place.
- The page does not jump up or down unexpectedly.

## Tests
- Scroll to top, trigger `loadMore`, confirm the same message stays visible.
- Repeat multiple loads without the sentinel firing in a loop.

## References
- Scroll anchoring: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor
