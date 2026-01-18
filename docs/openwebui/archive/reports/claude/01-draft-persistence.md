# Draft Persistence

> **Priority**: P0 (Critical)
> **Effort**: Low (< 2 hours)
> **Impact**: High - Users lose unsent text on refresh/navigation

---

## Summary

Save chat input text to sessionStorage so users don't lose their draft messages when they refresh the page, switch tabs, or navigate away accidentally.

---

## Current State

**File**: `apps/web/src/components/chat/ChatInput.tsx`

The input text is stored only in React state:

```typescript
// Line ~50-60 (varies)
const [input, setInput] = useState("");
```

When the page refreshes or the user navigates away:
- All unsent text is **permanently lost**
- No warning is shown
- No recovery mechanism exists

**Related state also lost:**
- `quote` state (reply context)
- Attachment previews (already uploaded files are recoverable from server)

---

## Problem

### User Impact
1. User types a long, thoughtful message
2. Accidentally refreshes page (Cmd+R) or clicks a link
3. Returns to empty input - message is gone
4. User frustration, potential loss of work

### Industry Standard
- **Open WebUI**: Saves drafts to sessionStorage with 500ms debounce
- **Gmail**: Auto-saves drafts every few seconds
- **Slack**: Persists drafts per-channel
- **ChatGPT**: Does NOT persist (blah.chat could differentiate here)

---

## Solution

### Implementation

**1. Add debounced save effect to ChatInput.tsx:**

```typescript
// Add near other useEffect hooks in ChatInput.tsx

// Save draft to sessionStorage with debounce
useEffect(() => {
  if (!conversationId) return;

  const timeoutId = setTimeout(() => {
    if (input.trim()) {
      sessionStorage.setItem(`draft-${conversationId}`, input);
    } else {
      sessionStorage.removeItem(`draft-${conversationId}`);
    }
  }, 500); // 500ms debounce - matches Open WebUI

  return () => clearTimeout(timeoutId);
}, [input, conversationId]);

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

// Clear draft after successful send
const handleSubmit = async (e?: React.FormEvent) => {
  // ... existing submit logic ...

  // After successful send:
  sessionStorage.removeItem(`draft-${conversationId}`);
};
```

**2. Clear draft on conversation delete:**

```typescript
// In conversation delete handler (wherever that lives)
sessionStorage.removeItem(`draft-${deletedConversationId}`);
```

**3. Optional: Save quote state too:**

```typescript
// Extend draft to include quote
interface Draft {
  input: string;
  quote?: string;
}

// Save
sessionStorage.setItem(`draft-${conversationId}`, JSON.stringify({ input, quote }));

// Restore
const draft: Draft = JSON.parse(sessionStorage.getItem(`draft-${conversationId}`) || '{}');
if (draft.input) setInput(draft.input);
if (draft.quote) setQuote(draft.quote);
```

### Why sessionStorage over localStorage?

| Storage | Persistence | Use Case |
|---------|-------------|----------|
| `sessionStorage` | Tab only, cleared on close | Drafts (don't need cross-session) |
| `localStorage` | Permanent until cleared | User preferences, settings |
| `Dexie/IndexedDB` | Permanent, queryable | Message cache, offline data |

sessionStorage is ideal because:
- Drafts are ephemeral by nature
- No cleanup needed on session end
- Per-tab isolation (multiple conversations in different tabs)
- Simple API, no async complexity

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/ChatInput.tsx` | Add save/restore effects |
| Optionally: conversation delete handler | Clear orphaned drafts |

---

## Testing

### Manual Testing
1. Type a message in chat input
2. Refresh the page (Cmd/Ctrl+R)
3. **Expected**: Input text restored
4. Send the message
5. Refresh the page
6. **Expected**: Input is empty (draft cleared)

### Edge Cases to Test
- [ ] Switch conversations - draft should be per-conversation
- [ ] Open same conversation in two tabs - each has own draft
- [ ] Close tab and reopen - draft should be gone (sessionStorage)
- [ ] Empty string vs whitespace - don't save whitespace-only drafts
- [ ] Very long drafts (10KB+) - should still work

### Automated Test

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
});
```

---

## References

### Open WebUI Implementation
```javascript
// From Open WebUI Chat.svelte
$: if (prompt) {
  // Debounced save
  sessionStorage.setItem(`chat-input-${$chatId}`, prompt);
}

onMount(() => {
  const saved = sessionStorage.getItem(`chat-input-${$chatId}`);
  if (saved) prompt = saved;
});
```

### Industry Patterns
- Gmail: Auto-save every 2 seconds to server
- Slack: Per-channel drafts in localStorage
- Discord: Per-channel drafts, synced to server
- ChatGPT: No draft persistence (opportunity to differentiate)

---

## Notes

- **Don't use Dexie** for this - sessionStorage is simpler and appropriate
- **500ms debounce** is the sweet spot - not too aggressive, not too slow
- **Per-conversation isolation** is critical - don't mix drafts across conversations
- Consider adding a visual indicator ("Draft saved") but not required for MVP
