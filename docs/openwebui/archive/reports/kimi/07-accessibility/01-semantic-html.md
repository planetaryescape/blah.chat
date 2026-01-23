# Work Item: Implement Semantic HTML for Messages

## Description
Convert message markup from generic `<div>` elements to semantic `<article>`, `<time>`, and proper ARIA attributes for screen reader compatibility.

## Problem Statement
Current message markup uses non-semantic HTML:
```typescript
// Current (not accessible)
<div className="message">
  <div className="author">User</div>
  <div className="content">{content}</div>
</div>
```

This causes issues for screen reader users:
- No structure announced (just "div div div")
- No authorship context
- No timestamp context
- Difficult navigation

## Solution Specification
Implement semantic HTML structure with proper ARIA labels.

## Implementation Steps

### Step 1: Update Message Component
**File**: `apps/web/src/components/chat/ChatMessage.tsx`
```typescript
export const ChatMessage = ({ message }) => {
  const authorId = `${message.id}-author`;
  const contentId = `${message.id}-content`;
  const timestampId = `${message.id}-timestamp`;
  
  return (
    <article
      role="article"
      aria-labelledby={authorId}
      aria-describedby={contentId}
      className="message"
      data-message-id={message.id}
      data-message-role={message.role}
    >
      <header className="message-header">
        <h3
          id={authorId}
          className="message-author"
        >
          {message.role === 'user' ? 'You' : message.modelName}
        </h3>
        
        <time
          id={timestampId}
          dateTime={new Date(message.createdAt).toISOString()}
          className="message-timestamp sr-only"
        >
          {formatRelativeTime(message.createdAt)}
        </time>
      </header>
      
      <div
        id={contentId}
        className="message-content"
        lang={detectLanguage(message.content)}
      >
        {message.content}
      </div>
      
      {message.attachments && message.attachments.length > 0 && (
        <aside 
          className="message-attachments"
          aria-label={`${message.attachments.length} attachments`}
        >
          {message.attachments.map(att => (
            <article key={att.id} className="attachment">
              <h4 className="sr-only">Attachment: {att.name}</h4>
              <AttachmentRenderer attachment={att} />
            </article>
          ))}
        </aside>
      )}
      
      {message.toolCalls && message.toolCalls.length > 0 && (
        <aside 
          className="message-tool-calls"
          aria-label={`${message.toolCalls.length} tool calls`}
        >
          {message.toolCalls.map(tc => (
            <details key={tc.id} className="tool-call">
              <summary>{tc.name}: {tc.status}</summary>
              <pre>{JSON.stringify(tc.result, null, 2)}</pre>
            </details>
          ))}
        </aside>
      )}
    </article>
  );
};

// Screen reader only text
const formatRelativeTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
};

const detectLanguage = (text: string): string => {
  // Simple heuristic - detect CJK, Arabic, etc.
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  return 'en';
};
```

### Step 2: CSS for Screen Reader Only
**File**: `apps/web/src/styles/accessibility.css`
```css
/* Screen reader only text */
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

/* High contrast mode support */
@media (prefers-contrast: more) {
  .message {
    border: 2px solid currentColor;
  }
}

/* Focus visible for keyboard navigation */
.message:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

## Expected Results

### Screen Reader Testing
```
Before (div soup):
- NVDA announcement: "Document, region, document"
- Navigation: Difficult (no landmarks)
- Context: Missing authorship

After (semantic):
- NVDA announcement: "Article, heading level 3 User, Article content"
- Navigation: Easy (landmarks present)
- Context: Full authorship and timestamp
```

### WCAG Compliance
```
Before:
- 1.3.1 Info and Relationships: FAIL
- 4.1.2 Name, Role, Value: FAIL
- 2.4.6 Headings and Labels: FAIL

After:
- 1.3.1 Info and Relationships: PASS
- 4.1.2 Name, Role, Value: PASS
- 2.4.6 Headings and Labels: PASS
```

## Testing Verification

```typescript
it('should render semantic HTML structure', () => {
  const { container } = render(<ChatMessage message={testMessage} />);
  
  // Should render article
  const article = container.querySelector('article');
  expect(article).toBeTruthy();
  expect(article).toHaveAttribute('role', 'article');
  
  // Should have author heading
  const author = container.querySelector('#message-1-author');
  expect(author).toBeTruthy();
  expect(author?.tagName).toBe('H3');
  
  // Should have timestamp
  const timestamp = container.querySelector('time');
  expect(timestamp).toBeTruthy();
  expect(timestamp).toHaveAttribute('datetime');
});
```

## Risk Assessment
- **Risk Level**: LOW
- **Breaking Changes**: HTML structure change (may affect CSS selectors)
- **Testing Required**: Accessibility audit with screen reader
- **User Impact**: Highly positive (accessibility)

## Priority
**HIGH** - Foundation for all accessibility work