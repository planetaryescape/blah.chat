# Message Send Animation

> **Priority**: P3 (Polish)
> **Effort**: Low (1-2 hours)
> **Impact**: Low - Subtle UX enhancement

---

## Summary

Add a subtle animation when user messages are sent, providing visual feedback that the message has been submitted. Currently, messages appear instantly without any transition.

---

## Current State

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

Messages appear instantly when added to the list. There's a global `message-enter` animation defined but it may not be consistently applied:

```css
/* From globals.css */
@keyframes message-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Problem

### Why Animation Helps

1. **Confirmation**: Visual feedback that send action was registered
2. **Continuity**: Smooth transition rather than jarring pop-in
3. **Perceived Performance**: Animations mask any micro-delays
4. **Polish**: Premium apps have considered transitions

### Industry Examples

| App | Send Animation |
|-----|----------------|
| iMessage | Slide up + scale bounce |
| WhatsApp | Fade + slide |
| Slack | Simple fade |
| Discord | Instant (no animation) |

---

## Solution

### Implementation

**1. Add animation class to new messages:**

```typescript
// apps/web/src/components/chat/ChatMessage.tsx

interface ChatMessageProps {
  message: Message;
  isNew?: boolean; // Flag for animation
}

export function ChatMessage({ message, isNew = false }: ChatMessageProps) {
  return (
    <motion.article
      initial={isNew ? { opacity: 0, y: 12, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom ease-out
      }}
      // ... rest of component
    >
      {/* Message content */}
    </motion.article>
  );
}
```

**2. Track new messages in parent:**

```typescript
// apps/web/src/components/chat/VirtualizedMessageList.tsx

export function VirtualizedMessageList({ messages }) {
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const prevMessagesRef = useRef<string[]>([]);

  useEffect(() => {
    const prevIds = new Set(prevMessagesRef.current);
    const newIds = messages
      .filter(m => !prevIds.has(m._id))
      .map(m => m._id);

    if (newIds.length > 0) {
      setNewMessageIds(prev => new Set([...prev, ...newIds]));

      // Clear "new" status after animation completes
      setTimeout(() => {
        setNewMessageIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.delete(id));
          return next;
        });
      }, 300);
    }

    prevMessagesRef.current = messages.map(m => m._id);
  }, [messages]);

  return (
    <div>
      {messages.map(message => (
        <ChatMessage
          key={message._id}
          message={message}
          isNew={newMessageIds.has(message._id)}
        />
      ))}
    </div>
  );
}
```

**3. Alternative: CSS-only approach:**

```css
/* Animation for newly added messages */
.message-new {
  animation: message-send 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes message-send {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  60% {
    transform: translateY(-2px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Animation Parameters

| Property | Value | Rationale |
|----------|-------|-----------|
| Duration | 250-300ms | Fast enough to feel snappy |
| translateY | 8-12px | Subtle upward slide |
| scale | 0.98 → 1.0 | Very subtle scale (optional) |
| Easing | ease-out or spring | Natural deceleration |

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/ChatMessage.tsx` | Add animation props |
| `apps/web/src/components/chat/VirtualizedMessageList.tsx` | Track new messages |
| `apps/web/src/app/globals.css` | Animation keyframes (if CSS approach) |

---

## Testing

### Manual Testing

1. Send a message
2. **Expected**: Message slides up smoothly from below
3. Send multiple messages quickly
4. **Expected**: Each animates independently
5. Receive AI response
6. **Expected**: Also animates (or different animation for AI)

### Edge Cases

- [ ] Optimistic message vs server-confirmed message - animate once
- [ ] Page refresh with messages - should NOT animate existing
- [ ] Virtualized list - animation should work for visible items
- [ ] Reduced motion preference - should skip animation

---

## References

### Framer Motion Spring

```typescript
// Spring animation for bounce effect
transition={{
  type: "spring",
  stiffness: 400,
  damping: 25,
}}
```

### CSS Cubic Bezier

```css
/* Overshoot (bounce) easing */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* Standard ease-out */
cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

---

## Notes

- **Keep it subtle** - animation should enhance, not distract
- **Respect reduced motion** - disable for `prefers-reduced-motion`
- **Don't animate on load** - only animate newly sent messages
- **Performance** - use `transform` and `opacity` only (GPU accelerated)
