# Keyboard Navigation Enhancements

> **Priority**: P3 (Accessibility)
> **Effort**: Medium (3-4 hours)
> **Impact**: Medium - Improves power user experience and accessibility

---

## Summary

Enhance keyboard navigation throughout the chat interface with additional shortcuts, better focus management, and vim-style navigation options for power users.

---

## Current State

**File**: `apps/web/src/hooks/useMessageKeyboardShortcuts.ts`

### Existing Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `R` | Regenerate | Message focused |
| `B` | Bookmark | Message focused |
| `C` | Copy | Message focused |
| `N` | Save as note | Message focused |
| `Delete/Backspace` | Delete | Message focused |
| `Enter` | Send message | Input focused |
| `Shift+Enter` | New line | Input focused |
| `Cmd+J` | Model switcher | Global |
| `Cmd+K` | Command palette | Global |

### Missing Shortcuts

- No message navigation (Up/Down between messages)
- No conversation navigation (Previous/Next conversation)
- No focus management from keyboard
- No skip-to-input shortcut

---

## Problem

### Why Better Keyboard Nav Matters

1. **Accessibility**: Some users can't use a mouse
2. **Power Users**: Keyboard is faster than mouse for many actions
3. **Screen Readers**: Keyboard nav is essential for screen reader users
4. **RSI Prevention**: Reduces mouse strain
5. **Professional Use**: Power users expect comprehensive shortcuts

---

## Solution

### 1. Message Navigation

```typescript
// apps/web/src/hooks/useChatKeyboardShortcuts.ts

function useChatKeyboardShortcuts({ messages, focusedMessageIndex, onFocusChange }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case 'j': // Vim-style down
        case 'ArrowDown':
          e.preventDefault();
          onFocusChange(Math.min(focusedMessageIndex + 1, messages.length - 1));
          break;

        case 'k': // Vim-style up
        case 'ArrowUp':
          e.preventDefault();
          onFocusChange(Math.max(focusedMessageIndex - 1, 0));
          break;

        case 'g': // Go to first message (vim gg)
          if (e.repeat) return; // Wait for second g
          // Start timer for gg
          break;

        case 'G': // Go to last message (vim G)
          e.preventDefault();
          onFocusChange(messages.length - 1);
          break;

        case 'i': // Focus input (vim insert mode)
          e.preventDefault();
          document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus();
          break;

        case 'Escape':
          // Blur current focus, return to message list
          (document.activeElement as HTMLElement)?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [messages, focusedMessageIndex, onFocusChange]);
}
```

### 2. Conversation Navigation

```typescript
// apps/web/src/hooks/useConversationKeyboardShortcuts.ts

function useConversationKeyboardShortcuts({ conversations, currentIndex }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when sidebar is focused or globally with modifier
      if (!e.altKey) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigateToConversation(currentIndex - 1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          navigateToConversation(currentIndex + 1);
          break;

        case 'n': // Alt+N: New conversation
          e.preventDefault();
          createNewConversation();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [conversations, currentIndex]);
}
```

### 3. Focus Ring Improvements

```css
/* apps/web/src/app/globals.css */

/* Visible focus for keyboard navigation */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
}

/* Messages should be focusable */
.message-wrapper:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -2px;
}

/* Skip focus ring for mouse clicks */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 4. Skip Links

```typescript
// apps/web/src/app/(main)/layout.tsx

function MainLayout({ children }) {
  return (
    <>
      <a
        href="#chat-input"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                   focus:z-50 focus:p-4 focus:bg-background focus:border focus:rounded"
      >
        Skip to chat input
      </a>
      <a
        href="#messages"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32
                   focus:z-50 focus:p-4 focus:bg-background focus:border focus:rounded"
      >
        Skip to messages
      </a>
      {children}
    </>
  );
}
```

### 5. Keyboard Shortcut Help Modal

```typescript
// apps/web/src/components/KeyboardShortcutsModal.tsx

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['↑', 'k'], description: 'Previous message' },
    { keys: ['↓', 'j'], description: 'Next message' },
    { keys: ['G'], description: 'Jump to latest message' },
    { keys: ['i'], description: 'Focus input' },
    { keys: ['Esc'], description: 'Return to messages' },
  ]},
  { category: 'Message Actions', items: [
    { keys: ['r'], description: 'Regenerate response' },
    { keys: ['c'], description: 'Copy message' },
    { keys: ['b'], description: 'Bookmark' },
    { keys: ['n'], description: 'Save as note' },
    { keys: ['Del'], description: 'Delete message' },
  ]},
  { category: 'Global', items: [
    { keys: ['⌘', 'K'], description: 'Command palette' },
    { keys: ['⌘', 'J'], description: 'Switch model' },
    { keys: ['Alt', 'N'], description: 'New conversation' },
    { keys: ['?'], description: 'Show shortcuts' },
  ]},
];

// Trigger with '?' key
```

### Complete Shortcut Map

| Shortcut | Action | Scope |
|----------|--------|-------|
| `↑` / `k` | Previous message | Message list |
| `↓` / `j` | Next message | Message list |
| `G` | Jump to last message | Message list |
| `gg` | Jump to first message | Message list |
| `i` | Focus input | Global |
| `Escape` | Blur / return to list | Global |
| `?` | Show shortcuts modal | Global |
| `r` | Regenerate | Message focused |
| `c` | Copy | Message focused |
| `b` | Bookmark | Message focused |
| `n` | Save as note | Message focused |
| `Delete` | Delete message | Message focused |
| `Cmd+K` | Command palette | Global |
| `Cmd+J` | Model switcher | Global |
| `Alt+N` | New conversation | Global |
| `Alt+↑` | Previous conversation | Global |
| `Alt+↓` | Next conversation | Global |
| `Enter` | Send | Input focused |
| `Shift+Enter` | New line | Input focused |

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/hooks/useChatKeyboardShortcuts.ts` | Add navigation shortcuts |
| `apps/web/src/hooks/useConversationKeyboardShortcuts.ts` | Create new hook |
| `apps/web/src/components/KeyboardShortcutsModal.tsx` | Create help modal |
| `apps/web/src/app/(main)/layout.tsx` | Add skip links |
| `apps/web/src/app/globals.css` | Focus styles |

---

## Testing

### Manual Testing

1. Press `j` / `↓` to navigate down through messages
2. Press `k` / `↑` to navigate up
3. Press `i` to focus input
4. Press `?` to see shortcuts modal
5. Test all shortcuts in the map

### Accessibility Testing

```bash
# Test with screen reader
# VoiceOver: Cmd+F5 (Mac)
# NVDA: Ctrl+Alt+N (Windows)

# Verify:
# - Focus announcements are correct
# - Skip links work
# - All actions accessible via keyboard
```

---

## Notes

- **Don't conflict with browser shortcuts** - avoid Ctrl+W, Ctrl+T, etc.
- **Vim-style is optional** - arrow keys should always work
- **Document shortcuts** - show `?` hint in UI
- **Respect input focus** - don't intercept typing
- **Test with screen readers** - ensure announcements are correct
