# Draft Persistence

> **Phase**: P2-input | **Effort**: 2h | **Impact**: Zero draft loss
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

Users lose unsent text when they refresh the page, switch tabs, or navigate away accidentally. There's no warning shown and no recovery mechanism. A user typing a long, thoughtful message who accidentally refreshes returns to an empty input - their work is permanently lost.

### Current Behavior

```typescript
// apps/web/src/components/chat/ChatInput.tsx
const [input, setInput] = useState("");
// Draft stored only in React state - lost on any navigation
```

When page refreshes or user navigates away:
- All unsent text is **permanently lost**
- No warning is shown
- No recovery mechanism exists
- Related state also lost: `quote` state (reply context), attachment previews

### Expected Behavior

- Draft saved to sessionStorage with 500ms debounce
- Draft restored on mount/conversation switch
- Draft cleared after successful send
- Per-conversation isolation (different drafts per conversation)
- Tab isolation (sessionStorage, not localStorage)

### Industry Standards

| App | Behavior |
|-----|----------|
| Open WebUI | Saves drafts to sessionStorage with 500ms debounce |
| Gmail | Auto-saves drafts every few seconds to server |
| Slack | Persists drafts per-channel |
| ChatGPT | Does NOT persist (opportunity to differentiate) |

---

## Current Implementation

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Draft only in React state
const [input, setInput] = useState("");

// No save/restore logic
// No sessionStorage usage
// No debounced persistence
```

---

## Solution

Implement sessionStorage-based draft persistence with debounced saves.

### Step 1: Add Debounced Save Effect

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Add near other useEffect hooks in ChatInput.tsx

const DRAFT_DEBOUNCE_MS = 500;

// Save draft to sessionStorage with debounce
useEffect(() => {
  if (!conversationId) return;

  const timeoutId = setTimeout(() => {
    if (input.trim()) {
      sessionStorage.setItem(`draft-${conversationId}`, input);
    } else {
      sessionStorage.removeItem(`draft-${conversationId}`);
    }
  }, DRAFT_DEBOUNCE_MS);

  return () => clearTimeout(timeoutId);
}, [input, conversationId]);
```

### Step 2: Add Restore on Mount

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Restore draft on mount
useEffect(() => {
  if (!conversationId) return;

  const savedDraft = sessionStorage.getItem(`draft-${conversationId}`);
  if (savedDraft && !input) {
    setInput(savedDraft);
  }
  // Only run on mount/conversation change
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [conversationId]);
```

### Step 3: Clear Draft After Send

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// In handleSubmit function
const handleSubmit = async (e?: React.FormEvent) => {
  // ... existing submit logic ...

  // After successful send:
  sessionStorage.removeItem(`draft-${conversationId}`);
};
```

### Step 4: Clear on Conversation Delete

**File**: Where conversation delete is handled

```typescript
// In conversation delete handler
sessionStorage.removeItem(`draft-${deletedConversationId}`);
```

### Step 5: Extended Draft with Quote/Attachments (Optional)

```typescript
interface Draft {
  input: string;
  quote?: string;
  attachmentIds?: string[]; // IDs only - files already uploaded
}

// Save
useEffect(() => {
  if (!conversationId) return;

  const timeoutId = setTimeout(() => {
    const draft: Draft = { input };
    if (quote) draft.quote = quote;
    if (attachments.length) {
      draft.attachmentIds = attachments.map(a => a.storageId);
    }

    if (draft.input.trim() || draft.quote || draft.attachmentIds?.length) {
      sessionStorage.setItem(`draft-${conversationId}`, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(`draft-${conversationId}`);
    }
  }, DRAFT_DEBOUNCE_MS);

  return () => clearTimeout(timeoutId);
}, [input, quote, attachments, conversationId]);

// Restore
useEffect(() => {
  if (!conversationId) return;

  try {
    const saved = sessionStorage.getItem(`draft-${conversationId}`);
    if (saved) {
      const draft: Draft = JSON.parse(saved);
      if (draft.input && !input) setInput(draft.input);
      if (draft.quote) setQuote(draft.quote);
      // Note: attachments would need to be re-fetched from server
    }
  } catch {
    // Invalid JSON - clear it
    sessionStorage.removeItem(`draft-${conversationId}`);
  }
}, [conversationId]);
```

### Why sessionStorage Over localStorage?

| Storage | Persistence | Use Case |
|---------|-------------|----------|
| `sessionStorage` | Tab only, cleared on close | Drafts (ephemeral) |
| `localStorage` | Permanent until cleared | User preferences |
| `IndexedDB/Dexie` | Permanent, queryable | Message cache |

sessionStorage is ideal because:
- Drafts are ephemeral by nature
- No cleanup needed on session end
- Per-tab isolation (multiple conversations in different tabs)
- Simple API, no async complexity

---

## Testing

### Manual Verification

1. Type a message in chat input
2. Refresh the page (Cmd/Ctrl+R)
3. **Expected**: Input text restored
4. Send the message
5. Refresh the page
6. **Expected**: Input is empty (draft cleared)

### Edge Cases

- [ ] Switch conversations - draft should be per-conversation
- [ ] Open same conversation in two tabs - each has own draft
- [ ] Close tab and reopen - draft should be gone (sessionStorage)
- [ ] Empty string vs whitespace - don't save whitespace-only drafts
- [ ] Very long drafts (10KB+) - should still work

### Unit Tests

```typescript
// __tests__/ChatInput.draft.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ChatInput draft persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves draft after typing', async () => {
    render(<ChatInput conversationId="conv-123" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello world' } });

    // Wait for debounce
    await waitFor(() => {
      expect(sessionStorage.getItem('draft-conv-123')).toBe('Hello world');
    }, { timeout: 600 });
  });

  it('restores draft on mount', () => {
    sessionStorage.setItem('draft-conv-123', 'Saved draft');

    render(<ChatInput conversationId="conv-123" />);

    expect(screen.getByRole('textbox')).toHaveValue('Saved draft');
  });

  it('clears draft after send', async () => {
    sessionStorage.setItem('draft-conv-123', 'To be sent');

    render(<ChatInput conversationId="conv-123" onSend={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('draft-conv-123')).toBeNull();
    });
  });

  it('does not restore draft if input already has content', () => {
    sessionStorage.setItem('draft-conv-123', 'Old draft');

    render(<ChatInput conversationId="conv-123" initialInput="New content" />);

    expect(screen.getByRole('textbox')).toHaveValue('New content');
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Draft loss on refresh | 100% | 0% | Eliminated |
| User frustration | High | None | Resolved |
| Recovery time | N/A (impossible) | Instant | New feature |
| Differentiation vs ChatGPT | Same | Better | Competitive advantage |

---

## Risk Assessment

- **Breaking Changes**: None - purely additive feature
- **Storage Impact**: ~1KB per draft max, sessionStorage (no disk persistence)
- **Browser Support**: sessionStorage 99%+
- **Complexity**: Low - straightforward implementation

---

## References

- **Sources**: claude/01-draft-persistence.md, codex/05-draft-persistence.md
- **Open WebUI Pattern**: Saves to sessionStorage with 500ms debounce
- **sessionStorage API**: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- **Related Issues**: P2-input/02-ime-composition.md
