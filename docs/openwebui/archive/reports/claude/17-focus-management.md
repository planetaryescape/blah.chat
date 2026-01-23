# Focus Management

> **Priority**: P3 (Accessibility)
> **Effort**: Medium (3-4 hours)
> **Impact**: Medium - Essential for keyboard and screen reader users

---

## Summary

Implement proper focus management throughout the chat interface, ensuring focus moves logically after actions and is never lost. This is critical for keyboard users and screen reader accessibility.

---

## Current State

**Files**: Various components

### Current Focus Behavior

Some focus management exists:
- Auto-focus on input after send (desktop only)
- Auto-focus on input after AI response completes
- Focus moves to next message after delete

### Problems

1. **Focus loss on modal close** - focus doesn't return to trigger
2. **Focus during streaming** - unclear where focus should be
3. **Focus after actions** - inconsistent behavior
4. **Focus trapping** - modals may not trap focus properly

---

## Problem

### Why Focus Management Matters

1. **Keyboard Navigation**: Users must know where they are
2. **Screen Readers**: Announce focused element
3. **Context Preservation**: Return focus to logical position
4. **WCAG 2.4.3**: Focus order must be meaningful
5. **WCAG 2.4.7**: Focus must be visible

### Common Focus Issues

| Issue | Impact |
|-------|--------|
| Focus lost to body | User must tab through entire page |
| Focus not trapped in modal | User can tab outside modal |
| Focus not returned after modal | User loses context |
| Focus jumps unexpectedly | Disorienting experience |

---

## Solution

### 1. Focus Return After Modal Close

```typescript
// apps/web/src/hooks/useFocusReturn.ts

import { useRef, useCallback } from 'react';

export function useFocusReturn() {
  const triggerRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement;
  }, []);

  const returnFocus = useCallback(() => {
    if (triggerRef.current && document.contains(triggerRef.current)) {
      triggerRef.current.focus();
    }
    triggerRef.current = null;
  }, []);

  return { saveFocus, returnFocus };
}

// Usage in modal component
function MyModal({ open, onClose }) {
  const { saveFocus, returnFocus } = useFocusReturn();

  useEffect(() => {
    if (open) {
      saveFocus();
    }
  }, [open, saveFocus]);

  const handleClose = () => {
    onClose();
    returnFocus();
  };

  return <Dialog open={open} onOpenChange={handleClose}>...</Dialog>;
}
```

### 2. Focus Trap for Modals

```typescript
// apps/web/src/hooks/useFocusTrap.ts

import { useEffect, useRef } from 'react';

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: if on first, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}
```

### 3. Focus After Message Actions

```typescript
// apps/web/src/components/chat/MessageActions.tsx

const handleDelete = async () => {
  // Find next or previous message to focus
  const currentIndex = messages.findIndex(m => m._id === message._id);
  const nextMessage = messages[currentIndex + 1] || messages[currentIndex - 1];

  await deleteMessage({ messageId: message._id });

  // Focus next message or input
  if (nextMessage) {
    document.getElementById(`message-${nextMessage._id}`)?.focus();
  } else {
    document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus();
  }
};

const handleCopy = async () => {
  await copyToClipboard(content);
  // Keep focus on same message for further actions
  // Focus is already correct, just announce to screen reader
};
```

### 4. Focus After AI Response

```typescript
// apps/web/src/components/chat/ChatInput.tsx

useEffect(() => {
  // Only refocus input after AI completes (not during streaming)
  if (
    lastMessage?.status === 'complete' &&
    lastMessage?.role === 'assistant' &&
    !isMobile &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    // Small delay to not interrupt user
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }
}, [lastMessage?.status]);
```

### 5. Visible Focus Indicator

```css
/* apps/web/src/app/globals.css */

/* Custom focus ring */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Message focus */
.message-wrapper:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -2px;
  border-radius: 0.5rem;
}

/* Remove focus ring for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* High visibility focus for accessibility */
@media (prefers-contrast: more) {
  :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

### 6. Skip Links

```typescript
// apps/web/src/components/SkipLinks.tsx

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#messages"
        className="absolute top-4 left-4 z-50 p-3 bg-background border rounded-md
                   focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to messages
      </a>
      <a
        href="#chat-input"
        className="absolute top-4 left-40 z-50 p-3 bg-background border rounded-md
                   focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to chat input
      </a>
    </div>
  );
}
```

### Focus Flow Diagram

```
Page Load
    ↓
[Chat Input] (auto-focus on empty conversation)
    ↓
User types → Sends message
    ↓
[Chat Input] (focus stays)
    ↓
AI streams → Completes
    ↓
[Chat Input] (refocus after delay)
    ↓
User presses ↓ to navigate
    ↓
[Message 1] → [Message 2] → ... → [Last Message]
    ↓
User opens modal (Cmd+K)
    ↓
[Modal First Element] (focus trapped)
    ↓
Modal closes
    ↓
[Previous Focus] (returned to trigger)
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/hooks/useFocusReturn.ts` | Create hook |
| `apps/web/src/hooks/useFocusTrap.ts` | Create hook |
| `apps/web/src/components/SkipLinks.tsx` | Create component |
| `apps/web/src/app/(main)/layout.tsx` | Add skip links |
| `apps/web/src/components/chat/MessageActions.tsx` | Focus after delete |
| `apps/web/src/app/globals.css` | Focus styles |

---

## Testing

### Manual Testing

1. Tab through the entire page
2. Verify focus order is logical
3. Open a modal, verify focus is trapped
4. Close modal, verify focus returns
5. Delete a message, verify focus moves to next
6. Test with screen reader

### Automated Testing

```typescript
// __tests__/focusManagement.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Focus management', () => {
  it('returns focus after modal close', async () => {
    render(<ComponentWithModal />);

    const trigger = screen.getByRole('button', { name: /open modal/i });
    trigger.focus();

    await userEvent.click(trigger);
    // Modal opens, focus inside

    await userEvent.keyboard('{Escape}');
    // Modal closes

    expect(document.activeElement).toBe(trigger);
  });

  it('traps focus inside modal', async () => {
    render(<Modal open />);

    const firstButton = screen.getByRole('button', { name: /first/i });
    const lastButton = screen.getByRole('button', { name: /last/i });

    lastButton.focus();
    await userEvent.tab();

    expect(document.activeElement).toBe(firstButton);
  });
});
```

---

## References

### WCAG Requirements

- **2.4.3 Focus Order** (Level A): Focus order preserves meaning
- **2.4.7 Focus Visible** (Level AA): Focus indicator is visible
- **2.1.2 No Keyboard Trap** (Level A): Keyboard focus can move away

### WAI-ARIA Practices

> "When a dialog opens, focus should be placed on the most relevant element inside the dialog. When the dialog closes, focus should return to the element that triggered the dialog."

---

## Notes

- **Never lose focus to body** - always move focus somewhere meaningful
- **Radix/shadcn handles some of this** - but verify
- **Test with real screen readers** - NVDA, VoiceOver
- **Focus visible must be visible** - check contrast
- **Mobile is different** - don't auto-focus (opens keyboard)
