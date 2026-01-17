# IME Composition Guard

> **Phase**: P2-input | **Effort**: 2h | **Impact**: 1.4B+ potential CJK users
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

When users type in Chinese, Japanese, Korean (CJK), or other complex scripts using Input Method Editors (IME), pressing Enter should confirm character selection, not submit the message. Without proper composition event handling, Enter submits messages mid-composition, making the chat unusable for international users.

### What is IME Composition?

When typing CJK text:
1. User types phonetic characters (e.g., "ni hao" for 你好)
2. IME shows candidate list for selection
3. User presses Enter to **confirm character selection**
4. User continues typing or presses Enter again to send

### Current Behavior

```typescript
// From useChatInputKeyboard.ts or ChatInput.tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSubmit(e);
  }
};
// NO composition event handling - submits during IME
```

### Visual Example

```
User typing Chinese:

Step 1: Types "ni"
┌─────────────────┐
│ ni              │ ← Underlined (composing)
│ 1. 你  2. 泥    │ ← Candidate list
└─────────────────┘

Step 2: Presses Enter to select 你

WITHOUT guard: Message "ni" gets sent immediately! ❌
WITH guard: Character selected, user can continue typing ✓
```

### Expected Behavior

- Enter during composition: confirm character selection only
- Enter after composition: submit message
- Works on all browsers (Chrome, Firefox, Safari, Edge)
- Handles Safari's different event ordering

### User Impact

| Language | Users Affected |
|----------|---------------|
| Chinese | ~1.1 billion |
| Japanese | ~128 million |
| Korean | ~77 million |
| Vietnamese | ~100 million |
| **Total** | **1.4+ billion** |

IME also used for: emoji shortcuts, voice dictation, Thai, Hindi, etc.

---

## Current Implementation

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Current keyboard handling - no composition awareness
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSubmit(e);
  }
};
```

**Missing**:
- `compositionstart` event handler
- `compositionend` event handler
- `e.nativeEvent.isComposing` check (Safari-specific)

---

## Solution

Add composition state tracking to prevent Enter from submitting during IME input.

### Step 1: Add Composition State

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Add state for tracking IME composition
const [isComposing, setIsComposing] = useState(false);

// Handle composition events
const handleCompositionStart = useCallback(() => {
  setIsComposing(true);
}, []);

const handleCompositionEnd = useCallback(() => {
  setIsComposing(false);
}, []);
```

### Step 2: Update Keyboard Handler

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Update keyboard handler to check composition state
const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // CRITICAL: Check both React state AND native event
  // Safari fires keydown BEFORE compositionend
  if (isComposing || e.nativeEvent.isComposing) {
    return; // Don't process shortcuts during IME composition
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }

  // ... other keyboard shortcuts (Escape, etc.)
}, [isComposing, handleSubmit]);
```

### Step 3: Attach Events to Textarea

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```tsx
<Textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  onCompositionStart={handleCompositionStart}
  onCompositionEnd={handleCompositionEnd}
  // ... other props
/>
```

### Step 4: Also Update ExpandedInputDialog (if exists)

**File**: `apps/web/src/components/chat/ExpandedInputDialog.tsx`

```typescript
// Same pattern in expanded input view
const [isComposing, setIsComposing] = useState(false);

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (isComposing || e.nativeEvent.isComposing) return;

  // Cmd/Ctrl+Enter to submit from expanded view
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    handleSubmit();
  }
};
```

### Step 5: Safari Timestamp Guard (Optional, Extra Safety)

For extra robustness on Safari iOS:

```typescript
const compositionEndTime = useRef<number>(0);

const handleCompositionEnd = useCallback(() => {
  setIsComposing(false);
  compositionEndTime.current = Date.now();
}, []);

const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // Check if composition just ended (within 50ms)
  const timeSinceCompositionEnd = Date.now() - compositionEndTime.current;
  const justEndedComposition = timeSinceCompositionEnd < 50;

  if (isComposing || e.nativeEvent.isComposing || justEndedComposition) {
    return;
  }

  // ... rest of handler
}, [isComposing]);
```

### Why Both Checks?

```typescript
if (isComposing || e.nativeEvent.isComposing) {
```

| Check | Purpose |
|-------|---------|
| `isComposing` (React state) | Reliable across most browsers |
| `e.nativeEvent.isComposing` | Safari-specific: fires keydown BEFORE compositionend |

Safari's event order:
```
compositionstart → keydown (Enter) → compositionend
                   ↑
                   isComposing state not updated yet!
                   But nativeEvent.isComposing = true
```

### Browser Event Order Matrix

| Browser | Event Order | isComposing Reliable |
|---------|-------------|---------------------|
| Chrome | compositionstart → keydown → compositionend | Yes (both) |
| Firefox | compositionstart → keydown → compositionend | Yes (both) |
| Safari | compositionstart → keydown → compositionend | Check nativeEvent |
| Edge | compositionstart → keydown → compositionend | Yes (both) |
| iOS Safari | Same as Safari | Check nativeEvent |

---

## Testing

### Manual Testing (Requires IME Setup)

**macOS:**
1. System Preferences → Keyboard → Input Sources → Add Chinese (Simplified) or Japanese
2. Switch input method (Ctrl+Space or Globe key)
3. Type "ni hao" in chat input
4. Press Enter to select characters
5. **Expected**: Characters confirmed, message NOT sent
6. Press Enter again (not composing)
7. **Expected**: Message sends

**Windows:**
1. Settings → Time & Language → Language → Add Japanese or Chinese
2. Press Win+Space to switch input
3. Same test as above

### Edge Cases

- [ ] Emoji picker (also uses composition events on some systems)
- [ ] Voice dictation (macOS Dictation uses composition)
- [ ] Rapid typing/composition toggle
- [ ] Composition cancelled (Escape key)
- [ ] Paste during composition

### Unit Tests

```typescript
// __tests__/ChatInput.ime.test.tsx
describe('ChatInput IME composition', () => {
  it('does not submit during composition', () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} conversationId="test" />);

    const textarea = screen.getByRole('textbox');

    // Start composition
    fireEvent.compositionStart(textarea);

    // Type and press Enter
    fireEvent.change(textarea, { target: { value: 'ni' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    // Should NOT submit
    expect(onSubmit).not.toHaveBeenCalled();

    // End composition
    fireEvent.compositionEnd(textarea);

    // Now Enter should submit
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('handles Safari event order (isComposing on native event)', () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} conversationId="test" />);

    const textarea = screen.getByRole('textbox');

    // Safari sends keydown with isComposing=true BEFORE compositionend
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      nativeEvent: { isComposing: true }
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits after composition ends', async () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} conversationId="test" />);

    const textarea = screen.getByRole('textbox');

    // Full composition cycle
    fireEvent.compositionStart(textarea);
    fireEvent.change(textarea, { target: { value: '你好' } });
    fireEvent.compositionEnd(textarea);

    // Wait a tick for state update
    await waitFor(() => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| CJK usability | Broken | Working | Critical fix |
| Premature submits | Constant | None | Eliminated |
| User base support | Western only | Global | 1.4B+ users |
| Competitive parity | Behind | Equal | Matches standards |

---

## Risk Assessment

- **Breaking Changes**: None - only adds composition awareness
- **Browser Support**: Composition events 99%+
- **Performance**: Zero - event handlers are synchronous
- **Testing**: Requires actual IME or careful simulation

---

## References

- **Sources**: claude/03-ime-composition-guard.md, codex/10-ime-safari-guard.md
- **CompositionEvent MDN**: https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent
- **KeyboardEvent.isComposing**: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing
- **Related Issues**: P2-input/01-draft-persistence.md, P2-input/03-paste-handling.md
