# Semantic HTML Structure

> **Phase**: P6-accessibility | **Effort**: 3h | **Impact**: WCAG 2.2 AA compliance
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

The chat interface uses generic `<div>` elements with CSS classes for visual structure, but lacks semantic meaning for assistive technologies. Screen readers cannot distinguish messages from controls, there's no role hierarchy, and keyboard navigation has no landmarks. This excludes users who rely on assistive technology.

### Current Behavior

```html
<div class="message-list">
  <div class="message">
    <div class="content">Hello world</div>
    <div class="timestamp">2:30 PM</div>
  </div>
</div>
```

- Screen readers announce: "div, div, div, Hello world, div, 2:30 PM"
- No semantic structure
- No ARIA roles or labels
- No landmarks for navigation

### Expected Behavior

```html
<main role="main" aria-label="Chat conversation">
  <article role="article" aria-label="Message from GPT-4">
    <p>Hello world</p>
    <time datetime="2024-01-15T14:30:00">2:30 PM</time>
  </article>
</main>
```

- Screen readers announce: "Main region, Chat conversation, Article, Message from GPT-4, Hello world, time 2:30 PM"
- Clear semantic structure
- Proper ARIA labeling
- Navigable landmarks

### WCAG Requirements

- **1.3.1 Info and Relationships**: Level A - Semantic structure
- **2.4.6 Headings and Labels**: Level AA - Descriptive labels
- **4.1.2 Name, Role, Value**: Level A - Accessible names

---

## Current Implementation

```typescript
// Generic divs with no semantic meaning
<div className="flex flex-col gap-2">
  {messages.map(msg => (
    <div key={msg._id} className="message">
      <div>{msg.content}</div>
    </div>
  ))}
</div>
```

---

## Solution

Add semantic HTML elements with ARIA attributes for screen reader accessibility.

### Step 1: Create Semantic Message Component

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

```typescript
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: Message;
  isGenerating?: boolean;
}

export function ChatMessage({ message, isGenerating }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const senderLabel = isAssistant
    ? `Message from ${message.model || 'AI'}`
    : 'Your message';

  return (
    <article
      role="article"
      aria-label={senderLabel}
      aria-busy={isGenerating}
      className="message-container"
    >
      {/* Message header */}
      <header className="message-header">
        <span className="sr-only">
          {isAssistant ? 'Assistant' : 'You'}
        </span>
        {isAssistant && message.model && (
          <span aria-hidden="true" className="model-badge">
            {message.model}
          </span>
        )}
      </header>

      {/* Message content */}
      <div
        role="region"
        aria-label="Message content"
        className="message-content"
      >
        <MarkdownContent content={message.content} />
      </div>

      {/* Timestamp */}
      <footer className="message-footer">
        <time
          dateTime={new Date(message._creationTime).toISOString()}
          aria-label={`Sent ${formatDistanceToNow(message._creationTime)} ago`}
        >
          {formatDistanceToNow(message._creationTime, { addSuffix: true })}
        </time>
      </footer>

      {/* Status for generating messages */}
      {isGenerating && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Generating response"
          className="sr-only"
        >
          Generating response...
        </div>
      )}
    </article>
  );
}
```

### Step 2: Create Semantic Message List

**File**: `apps/web/src/components/chat/MessageList.tsx`

```typescript
interface MessageListProps {
  messages: Message[];
  generatingId?: string;
}

export function MessageList({ messages, generatingId }: MessageListProps) {
  return (
    <main
      role="main"
      aria-label="Chat conversation"
      className="message-list"
    >
      {/* Skip link for keyboard users */}
      <a
        href="#chat-input"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:p-2 focus:rounded"
      >
        Skip to message input
      </a>

      {/* Message group */}
      <section
        role="log"
        aria-live="polite"
        aria-label="Message history"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Start a conversation by sending a message.
          </p>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message._id}
              message={message}
              isGenerating={message._id === generatingId}
            />
          ))
        )}
      </section>

      {/* Live region for new messages */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        id="message-announcer"
      />
    </main>
  );
}
```

### Step 3: Create Semantic Sidebar

**File**: `apps/web/src/components/sidebar/ConversationList.tsx`

```typescript
export function ConversationList({ conversations }: ConversationListProps) {
  return (
    <aside
      role="complementary"
      aria-label="Conversation history"
    >
      <nav aria-label="Conversations">
        <h2 className="sr-only">Your conversations</h2>

        <ul role="list" aria-label="Conversation list">
          {conversations.map((conv) => (
            <li key={conv._id}>
              <a
                href={`/chat/${conv._id}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${conv.title || 'Untitled'}, ${formatDate(conv._creationTime)}`}
              >
                <span className="truncate">{conv.title || 'Untitled'}</span>
                <time
                  dateTime={new Date(conv._creationTime).toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {formatDistanceToNow(conv._creationTime)}
                </time>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

### Step 4: Add Screen Reader Announcements

**File**: `apps/web/src/hooks/useAnnounce.ts`

```typescript
import { useCallback } from 'react';

export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('message-announcer');
    if (!announcer) return;

    // Clear and set to trigger announcement
    announcer.textContent = '';
    announcer.setAttribute('aria-live', priority);

    // Use setTimeout to ensure DOM update triggers announcement
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }, []);

  return { announce };
}
```

### Step 5: Announce New Messages

**File**: `apps/web/src/hooks/useMessageAnnouncer.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useAnnounce } from './useAnnounce';

export function useMessageAnnouncer(messages: Message[]) {
  const { announce } = useAnnounce();
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = messages.length;

    if (currentCount > prevCount) {
      const newMessage = messages[currentCount - 1];
      const sender = newMessage.role === 'assistant' ? 'Assistant' : 'You';

      // Truncate long messages for announcement
      const preview = newMessage.content.slice(0, 100);
      const truncated = newMessage.content.length > 100 ? '...' : '';

      announce(`${sender} said: ${preview}${truncated}`);
    }

    prevCountRef.current = currentCount;
  }, [messages, announce]);
}
```

### Step 6: Add CSS for Screen Reader Only

**File**: `apps/web/src/app/globals.css`

```css
/* Screen reader only - visible to AT, hidden visually */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Show on focus (for skip links) */
.sr-only.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Semantic HTML Reference

| Element | Use Case | ARIA Enhancement |
|---------|----------|------------------|
| `<main>` | Primary content area | `role="main"`, `aria-label` |
| `<article>` | Individual messages | `role="article"`, `aria-label` |
| `<aside>` | Sidebar/complementary | `role="complementary"` |
| `<nav>` | Navigation lists | `aria-label` |
| `<time>` | Timestamps | `datetime`, `aria-label` |
| `<header>` | Message header | Within article |
| `<footer>` | Message footer | Within article |
| `<section>` | Logical groupings | `role="log"` for chat |

---

## Testing

### Manual Testing with Screen Reader

1. Open app with VoiceOver (Mac) or NVDA (Windows)
2. Navigate to chat area
3. **Expected**: "Main region, Chat conversation"
4. Navigate to a message
5. **Expected**: "Article, Message from GPT-4, [content], time [timestamp]"
6. Navigate to sidebar
7. **Expected**: "Complementary, Conversation history, navigation"

### Automated Testing

```typescript
describe('Semantic HTML', () => {
  it('should have proper landmark roles', () => {
    render(<ChatPage />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render messages as articles', () => {
    render(<MessageList messages={mockMessages} />);

    const articles = screen.getAllByRole('article');
    expect(articles.length).toBe(mockMessages.length);
  });

  it('should have accessible labels', () => {
    render(<ChatMessage message={mockMessage} />);

    expect(screen.getByRole('article')).toHaveAccessibleName(/Message from/);
    expect(screen.getByRole('time')).toHaveAccessibleName(/Sent/);
  });

  it('should announce new messages', async () => {
    const { rerender } = render(<MessageList messages={[]} />);

    rerender(<MessageList messages={[mockMessage]} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/said:/);
    });
  });
});
```

### axe-core Integration

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<ChatPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| WCAG 1.3.1 | Fail | Pass | Compliant |
| WCAG 2.4.6 | Fail | Pass | Compliant |
| WCAG 4.1.2 | Fail | Pass | Compliant |
| Screen reader usability | 2/10 | 9/10 | +350% |
| Landmark navigation | None | Full | Enabled |
| axe-core violations | 12+ | 0 | Clean |

---

## Risk Assessment

- **Breaking Changes**: None - additive semantic enhancement
- **Browser Support**: Native HTML5 100%
- **Performance Impact**: None - no JS overhead
- **Visual Changes**: None - semantic only
- **Testing**: Add axe-core to CI pipeline

---

## References

- **Sources**: kimi/07-accessibility/01-semantic-html.md, IMPLEMENTATION-SPECIFICATION.md
- **WCAG 2.2**: https://www.w3.org/WAI/WCAG22/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **Related Issues**: P6-accessibility/02-keyboard-navigation.md, P6-accessibility/04-focus-management.md
