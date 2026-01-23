# Fix: Auto-Scroll Behavior in Simple Mode

**Context:**
The chat interface splits logic between "Virtual Mode" (>500 messages) and "Simple Mode". In "Simple Mode", auto-scroll is triggered by message *count* changes.

**The Issue:**
When an assistant message is streaming, the message count (`grouped.length`) remains constant. The content height grows, but the container does not scroll to keep the bottom in view. This breaks the "stick-to-bottom" behavior.

**Target File:**
`apps/web/src/components/chat/VirtualizedMessageList.tsx`

**Proposed Solution:**
Implement a `ResizeObserver` on the scroll container in "Simple Mode".

**Implementation Details:**
```typescript
// Inside the Simple Mode render block or hook
useLayoutEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const handleResize = () => {
    // Check if we were near bottom before resize (or just force it if we want aggressive sticking)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const observer = new ResizeObserver(handleResize);
  observer.observe(container);

  return () => observer.disconnect();
}, []);
```
**Alternative:** Remove "Simple Mode" entirely and use `react-virtuoso` for all lists, which handles this natively.
