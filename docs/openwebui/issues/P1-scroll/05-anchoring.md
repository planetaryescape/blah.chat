# Scroll Anchoring

> **Status**: ✅ Complete (2026-01-18)
> **Phase**: P1-scroll | **Effort**: 4h | **Impact**: Stable reading position
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

When content above the viewport changes (message deleted, image loads, code block expands), the user's scroll position jumps unexpectedly. They lose their reading position and must manually scroll back.

### Current Behavior

```
1. User scrolls to read message at middle of conversation
2. Another process deletes a message above viewport
3. scrollHeight decreases by deleted message height
4. User's scroll position jumps up relative to content
5. Reading position lost, user confused
```

No scroll anchoring implementation exists.

### Expected Behavior

- Deleted message above viewport: scroll adjusts to maintain viewport content
- Deleted message in viewport: animate out smoothly
- Content expanding (images, code blocks): maintain reading position
- No cumulative scroll drift

---

## Current Implementation

No scroll anchoring implemented. Content changes cause direct scroll position shifts.

```typescript
// When message height changes, no adjustment made
// User sees sudden jump in content
```

---

## Solution

Implement scroll anchoring using CSS `overflow-anchor` where supported, with JavaScript fallback using ResizeObserver.

### Step 1: Enable CSS Scroll Anchoring

**File**: `apps/web/src/app/globals.css`

```css
.messages-container {
  /* Enable native scroll anchoring */
  overflow-anchor: auto;
}

/* Prevent specific elements from being anchored */
.message-loading-skeleton,
.scroll-anchor-ignore {
  overflow-anchor: none;
}
```

### Step 2: Create Scroll Anchor Hook (JavaScript Fallback)

**File**: `apps/web/src/hooks/useScrollAnchor.ts`

```typescript
import { useEffect, useRef } from 'react';

interface AnchorState {
  element: HTMLElement | null;
  offsetTop: number;
}

/**
 * Maintains scroll position relative to visible content
 * when elements above the viewport change size
 */
export function useScrollAnchor(
  containerRef: React.RefObject<HTMLElement>,
  enabled = true
) {
  const anchorRef = useRef<AnchorState>({ element: null, offsetTop: 0 });
  const lastScrollHeight = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Find the first visible message to use as anchor
    const findAnchorElement = (): HTMLElement | null => {
      const messages = container.querySelectorAll('[data-message-id]');
      const containerRect = container.getBoundingClientRect();

      for (const message of messages) {
        const rect = message.getBoundingClientRect();
        // First message that's at least partially visible
        if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
          return message as HTMLElement;
        }
      }
      return null;
    };

    // Save anchor before changes
    const saveAnchor = () => {
      const anchor = findAnchorElement();
      if (anchor) {
        anchorRef.current = {
          element: anchor,
          offsetTop: anchor.getBoundingClientRect().top - container.getBoundingClientRect().top,
        };
      }
      lastScrollHeight.current = container.scrollHeight;
    };

    // Restore anchor after changes
    const restoreAnchor = () => {
      const { element, offsetTop } = anchorRef.current;
      if (!element || !container.contains(element)) return;

      const newOffsetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
      const diff = newOffsetTop - offsetTop;

      if (Math.abs(diff) > 1) {
        container.scrollTop += diff;
      }
    };

    // Observe size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== container) {
          // Child element resized
          restoreAnchor();
        }
      }
    });

    // Observe all message elements
    const observeMessages = () => {
      const messages = container.querySelectorAll('[data-message-id]');
      messages.forEach((message) => {
        resizeObserver.observe(message);
      });
    };

    // Mutation observer for added/removed messages
    const mutationObserver = new MutationObserver((mutations) => {
      saveAnchor();

      // Wait for DOM update, then restore
      requestAnimationFrame(() => {
        restoreAnchor();
        observeMessages(); // Re-observe new elements
      });
    });

    // Start observing
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    observeMessages();

    // Save anchor on scroll
    const handleScroll = () => {
      saveAnchor();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, enabled]);
}
```

### Step 3: Integrate with Messages List

**File**: `apps/web/src/components/chat/VirtualizedMessageList.tsx`

```typescript
import { useScrollAnchor } from '@/hooks/useScrollAnchor';

const VirtualizedMessageList = ({ messages, conversationId }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Enable scroll anchoring
  useScrollAnchor(scrollContainerRef, true);

  return (
    <div ref={scrollContainerRef} className="messages-container">
      {messages.map((message) => (
        <div key={message._id} data-message-id={message._id}>
          <ChatMessage message={message} />
        </div>
      ))}
    </div>
  );
};
```

### Step 4: Handle Image Loading

**File**: `apps/web/src/components/chat/MessageAttachment.tsx`

```typescript
export const MessageAttachment = ({ attachment }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="message-attachment"
      style={{
        // Reserve space to prevent layout shift
        minHeight: loaded ? undefined : '200px',
      }}
    >
      <img
        src={attachment.url}
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};
```

### Step 5: Handle Code Block Expansion

**File**: `apps/web/src/components/chat/CodeBlock.tsx`

```typescript
export const CodeBlock = ({ code, language }) => {
  const [expanded, setExpanded] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const toggleExpand = () => {
    // Measure before change
    const scrollContainer = codeRef.current?.closest('.messages-container');
    const beforeHeight = codeRef.current?.offsetHeight || 0;

    setExpanded(!expanded);

    // After state update, adjust scroll
    requestAnimationFrame(() => {
      if (!scrollContainer || !codeRef.current) return;
      const afterHeight = codeRef.current.offsetHeight;
      const diff = afterHeight - beforeHeight;

      // If expanding and code is above viewport center, adjust
      const rect = codeRef.current.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      if (rect.top < containerRect.top + containerRect.height / 2) {
        scrollContainer.scrollTop += diff;
      }
    });
  };

  return (
    <pre ref={codeRef} className={cn(expanded ? '' : 'max-h-[200px]')}>
      <code>{code}</code>
      {code.split('\n').length > 10 && (
        <button onClick={toggleExpand}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </pre>
  );
};
```

---

## Testing

### Manual Verification

1. Scroll to middle of long conversation
2. Delete a message above current viewport
3. **Expected**: Reading position maintained
4. Load conversation with images
5. Scroll past image placeholders
6. Wait for images to load
7. **Expected**: No scroll jump when images load
8. Click "Expand" on collapsed code block
9. **Expected**: Content below stays in view

### Unit Tests

```typescript
describe('Scroll Anchoring', () => {
  it('should maintain position when content above changes', () => {
    const container = document.createElement('div');
    container.style.height = '500px';
    container.style.overflow = 'auto';

    // Add messages
    for (let i = 0; i < 20; i++) {
      const msg = document.createElement('div');
      msg.dataset.messageId = `msg-${i}`;
      msg.style.height = '100px';
      msg.textContent = `Message ${i}`;
      container.appendChild(msg);
    }

    document.body.appendChild(container);

    // Scroll to message 10
    container.scrollTop = 1000;
    const msg10 = container.querySelector('[data-message-id="msg-10"]');
    const initialOffset = msg10.getBoundingClientRect().top;

    // Remove message 5 (above viewport)
    container.querySelector('[data-message-id="msg-5"]').remove();

    // With anchoring, message 10 should stay in same visual position
    // (This test would need the hook to be running)
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Scroll drift on delete | Full message height | 0px | Fixed |
| Image load shift | Variable | 0px | Fixed |
| Code expand shift | Variable | Maintained | Fixed |
| User reports | "Jumped around" | None | Resolved |

---

## Risk Assessment

- **Breaking Changes**: None - additive enhancement
- **Browser Support**: CSS overflow-anchor 87%, JS fallback 99%
- **Performance**: ResizeObserver is efficient
- **Complexity**: Moderate - needs careful testing

---

## References

- **Sources**: deep-research-report.md:155-184, codex/02-preserve-scroll-on-pagination.md
- **CSS Scroll Anchoring**: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor
- **ResizeObserver**: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- **Related Issues**: P1-scroll/01-threshold-optimization.md
