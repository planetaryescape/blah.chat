# IME Composition Guard

> **Priority**: P0 (Critical)
> **Effort**: Low (< 1 hour)
> **Impact**: High - Prevents broken input for CJK language users

---

## Summary

Add Input Method Editor (IME) composition event handling to prevent the Enter key from submitting messages while users are composing Chinese, Japanese, or Korean text.

---

## Current State

**File**: `apps/web/src/components/chat/ChatInput.tsx`

### Current Keyboard Handling

```typescript
// From useChatInputKeyboard.ts or ChatInput.tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSubmit(e);
  }
  // ... other shortcuts
};
```

### What's Missing

No composition event handling:
```typescript
// These events are NOT being tracked:
// - compositionstart
// - compositionend
// - e.nativeEvent.isComposing (Safari-specific)
```

**Related file**: `apps/web/src/components/ui/textarea.tsx`
- Pure HTML passthrough with no composition event guards
- Standard React change handlers only

---

## Problem

### What is IME Composition?

When typing in Chinese, Japanese, Korean (CJK), or other complex scripts:
1. User types phonetic characters (e.g., "ni hao" for 你好)
2. IME shows candidate list for selection
3. User presses Enter to **confirm character selection**
4. User continues typing

**Without guard**: Enter submits the message mid-composition
**With guard**: Enter confirms character selection, message stays in input

### Visual Example

```
User typing Chinese:

Step 1: Types "ni"
┌─────────────────┐
│ ni              │ ← Underlined (composing)
│ 1. 你  2. 泥    │ ← Candidate list
└─────────────────┘

Step 2: Presses Enter to select 你
┌─────────────────┐
│ 你              │ ← Character confirmed
└─────────────────┘

WITHOUT guard: Message "ni" gets sent immediately!
WITH guard: Character selection completes, user can continue typing
```

### User Impact
- **Chinese speakers**: Can't type properly, messages send mid-word
- **Japanese speakers**: Hiragana/Katakana conversion broken
- **Korean speakers**: Hangul composition interrupted
- **Any IME user**: Broken experience, unusable chat

### Market Context
- 1.4+ billion potential CJK users
- IME also used for: Vietnamese, Thai, emoji shortcuts, voice dictation

---

## Solution

### Implementation

**1. Add composition state tracking in ChatInput.tsx:**

```typescript
// Add state for tracking IME composition
const [isComposing, setIsComposing] = useState(false);

// Handle composition events
const handleCompositionStart = () => {
  setIsComposing(true);
};

const handleCompositionEnd = () => {
  setIsComposing(false);
};

// Update keyboard handler to check composition state
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // CRITICAL: Check both React state AND native event
  // Safari fires keydown BEFORE compositionend
  if (isComposing || e.nativeEvent.isComposing) {
    return; // Don't process shortcuts during IME composition
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }

  // ... other keyboard shortcuts
};
```

**2. Update textarea element:**

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

**3. Also update ExpandedInputDialog.tsx:**

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
                   Need isComposing check here, but state not updated yet!
```

The `nativeEvent.isComposing` property catches this edge case.

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/ChatInput.tsx` | Add composition handling |
| `apps/web/src/components/chat/ExpandedInputDialog.tsx` | Same pattern |
| `apps/web/src/hooks/useChatInputKeyboard.ts` | If keyboard logic is extracted |

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

### Automated Testing

```typescript
// __tests__/ChatInput.ime.test.tsx
describe('ChatInput IME composition', () => {
  it('does not submit during composition', () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} />);

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
    render(<ChatInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox');

    // Safari sends keydown with isComposing=true BEFORE compositionend
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      nativeEvent: { isComposing: true }
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### Edge Cases
- [ ] Emoji picker (also uses composition events on some systems)
- [ ] Voice dictation (macOS Dictation uses composition)
- [ ] Rapid typing/composition toggle
- [ ] Composition cancelled (Escape key)

---

## References

### Open WebUI Pattern
```javascript
// From Open WebUI MessageInput.svelte
export let oncompositionstart = (e) => {};
export let oncompositionend = (e) => {};

// Mobile WebView paste workaround included
if (isMobile) {
  // Reconstruct multiline with hard breaks
}
```

### MDN Documentation
- [CompositionEvent](https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent)
- [KeyboardEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing)

### Browser Behavior Matrix

| Browser | compositionstart → keydown order | isComposing reliable |
|---------|-----------------------------------|---------------------|
| Chrome | compositionstart first | Yes |
| Firefox | compositionstart first | Yes |
| Safari | keydown can fire first | Yes (check nativeEvent) |
| Edge | compositionstart first | Yes |
| iOS Safari | Same as Safari | Yes |

---

## Related Improvements

After implementing:
1. **Auto-resize during composition** - May cause jitter (investigate)
2. **Paste handling during composition** - Edge case to test
3. **Voice input support** - Similar composition pattern

---

## Notes

- This is a **critical fix** for international users
- Test on actual IME, not just simulated events
- The double-check pattern (`isComposing || e.nativeEvent.isComposing`) is intentional
- Don't debounce composition events - they need immediate response
