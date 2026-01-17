# Fix: Initial Load Scroll Jitter

**Context:**
The chat component attempts to scroll to the bottom when first loaded.

**The Issue:**
It currently uses a chain of `setTimeout` calls (0ms, 50ms, 150ms) to force the scroll. This causes a visible "jump" or flash where the top of the chat is rendered before snapping to the bottom.

**Target File:**
`apps/web/src/components/chat/VirtualizedMessageList.tsx`

**Proposed Solution:**
Replace `setTimeout` hacks with deterministic `useLayoutEffect`.

**Implementation Details:**
- Use `useLayoutEffect` to set `scrollTop` immediately after the DOM layout but before paint.
- For `react-virtuoso`, ensure `initialTopMostItemIndex` is calculated correctly based on the passed `messages` prop length minus 1.
