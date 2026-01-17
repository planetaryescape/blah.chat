# Work Item 01: Fix Non-Virtual Autoscroll Tracking

## Summary
The non-virtual message list does not reliably detect when the user is at the bottom after new content increases height (streaming deltas, images, font load). This causes the newest assistant text to render off-screen without showing the "scroll to bottom" button.

## Problem
- In non-virtual mode, `atBottom` is updated only on scroll events.
- When content grows without user scrolling, `atBottom` remains stale.
- The UI can appear frozen because the scroll-to-bottom button does not appear and the latest content is hidden.

## User Impact
- Users miss new assistant content.
- Streaming feels broken on long messages or when images load after text.

## Proposed Fix
- Track content height changes with a `ResizeObserver` or `MutationObserver`.
- Recompute `atBottom` on height change.
- If the user was at bottom before the change, auto-scroll to keep pinned.

## Implementation Notes
- File: `apps/web/src/components/chat/VirtualizedMessageList.tsx`
- Add an observer to `scrollContainerRef` in non-virtual mode.
- Keep a ref for `wasAtBottom` before updates.
- Update `atBottom` when content height changes.

Pseudo approach:
- On mount, observe container content size.
- On resize:
  - `const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold`.
  - If `wasAtBottom` true, call `scrollToBottom()`.
  - Update `atBottom` state.

## Acceptance Criteria
- When streaming adds text, the list stays pinned if the user is at bottom.
- If the user scrolls up, new content does not force-scroll.
- The scroll-to-bottom button appears when the user is no longer at bottom, even if they did not scroll.

## Tests
- Manually stream a long response and verify the view remains pinned.
- Scroll up mid-stream and verify the view does not snap back.
- Attach an image in an assistant response and verify layout shifts do not hide new content.
