# Paste Handling

> **Status**: ✅ DONE (PR #168)
> **Phase**: P2-input | **Effort**: 2h | **Impact**: Common workflow support
> **Dependencies**: None | **Breaking**: No

## Implementation Notes

Implemented in PR #168 with slight modification:
- Large pastes (10k+ chars) → auto-convert to `.txt` file attachment (better UX than confirmation dialog)
- HTML stripping → plain text only
- Image paste → attachment with preview
- Race condition fix: reads `textarea.value` instead of closure state

---

## Problem Statement

Users commonly paste content into chat - screenshots, code from IDE, text from web pages. The current implementation lacks an explicit `onPaste` handler, leading to inconsistent behavior: rich text may retain unwanted formatting, image paste may not work, and large pastes can cause performance issues without warning.

### Current Behavior

```typescript
// apps/web/src/components/chat/ChatInput.tsx
// Uses react-dropzone for file handling
// No explicit onPaste event handler
// Rich text pasted retains formatting (if browser allows)
// Image paste: unclear behavior
```

### Paste Scenarios to Handle

| Scenario | Current | Expected |
|----------|---------|----------|
| Rich text from web | Keeps HTML formatting | Strip to plain text |
| Screenshot paste | May not work | Add to attachments |
| Code from IDE | HTML syntax highlighting | Plain text (or code block) |
| Large text (10KB+) | Silent performance hit | Confirmation dialog |
| Mixed content | Unpredictable | Handle appropriately |

### Expected Behavior

- HTML stripped to plain text (prevent XSS, display issues)
- Image paste adds to attachments with preview
- Code paste optionally wrapped in markdown code block
- Large paste shows confirmation dialog
- Cursor position preserved on text paste

---

## Current Implementation

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// No onPaste handler
<Textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  // Missing: onPaste={handlePaste}
/>
```

---

## Solution

Add comprehensive paste handling for text, images, and files.

### Step 1: Add Main Paste Handler

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const clipboardData = e.clipboardData;

  // 1. Check for images first
  const items = Array.from(clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));

  if (imageItem) {
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) {
      handleImagePaste(file);
    }
    return;
  }

  // 2. Check for files
  const files = Array.from(clipboardData.files);
  if (files.length > 0) {
    e.preventDefault();
    handleFilesPaste(files);
    return;
  }

  // 3. Handle text
  const html = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');

  // 4. Large paste warning
  const LARGE_PASTE_THRESHOLD = 10000; // characters
  if (plainText.length > LARGE_PASTE_THRESHOLD) {
    e.preventDefault();
    handleLargePaste(plainText);
    return;
  }

  // 5. Strip HTML formatting - use plain text
  if (html && plainText) {
    e.preventDefault();
    insertTextAtCursor(plainText);
    return;
  }

  // Plain text only - let default behavior handle it
}, [handleImagePaste, handleFilesPaste, handleLargePaste, insertTextAtCursor]);
```

### Step 2: Add Text Insertion Helper

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
// Helper to insert text at cursor position
const insertTextAtCursor = useCallback((text: string) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = input.slice(0, start);
  const after = input.slice(end);

  const newValue = before + text + after;
  setInput(newValue);

  // Set cursor position after inserted text
  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  });
}, [input, setInput]);
```

### Step 3: Add Image Paste Handler

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
const handleImagePaste = useCallback(async (file: File) => {
  // Validate file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    toast.error('Image too large (max 10MB)');
    return;
  }

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast.error('Unsupported image format');
    return;
  }

  try {
    // Use existing upload logic
    const attachment = await uploadFile(file);
    onAttachmentsChange([...attachments, attachment]);
    toast.success('Image added');
  } catch (error) {
    toast.error('Failed to upload image');
    console.error('Image paste upload failed:', error);
  }
}, [attachments, onAttachmentsChange, uploadFile]);
```

### Step 4: Add Large Paste Handler

**File**: `apps/web/src/components/chat/ChatInput.tsx`

```typescript
const [largePasteContent, setLargePasteContent] = useState<string | null>(null);

const handleLargePaste = useCallback((text: string) => {
  setLargePasteContent(text);
}, []);

const confirmLargePaste = useCallback(() => {
  if (largePasteContent) {
    insertTextAtCursor(largePasteContent);
    setLargePasteContent(null);
  }
}, [largePasteContent, insertTextAtCursor]);

// In JSX:
<AlertDialog
  open={!!largePasteContent}
  onOpenChange={(open) => !open && setLargePasteContent(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Large paste detected</AlertDialogTitle>
      <AlertDialogDescription>
        You're about to paste {largePasteContent?.length.toLocaleString()} characters.
        This may affect performance.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmLargePaste}>
        Paste anyway
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Step 5: Optional Code Detection

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const html = e.clipboardData.getData('text/html');
  const plainText = e.clipboardData.getData('text/plain');

  // Detect if this looks like code from an IDE
  const looksLikeCode =
    html?.includes('class="hljs"') ||      // highlight.js
    html?.includes('class="token"') ||      // Prism
    html?.includes('data-language') ||      // Various editors
    html?.includes('monaco-editor') ||      // VS Code
    /^\s*(function|const|let|var|import|export|class|def |fn |pub fn)\s/.test(plainText);

  if (looksLikeCode && plainText.includes('\n')) {
    e.preventDefault();
    // Wrap multi-line code in markdown code block
    const wrappedCode = '```\n' + plainText.trim() + '\n```';
    insertTextAtCursor(wrappedCode);
    return;
  }

  // Normal paste handling...
}, [insertTextAtCursor]);
```

### Step 6: Attach Handler to Textarea

```tsx
<Textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onPaste={handlePaste}
  // ... other props
/>
```

---

## Testing

### Manual Verification

1. **Rich text paste**:
   - Copy formatted text from a webpage (bold, links, etc.)
   - Paste into chat input
   - **Expected**: Plain text inserted (no formatting)

2. **Image paste**:
   - Take a screenshot (Cmd+Shift+4 on Mac)
   - Paste into chat input
   - **Expected**: Image added to attachments with preview

3. **Code paste**:
   - Copy code from VS Code
   - Paste into chat input
   - **Expected**: Plain text (or wrapped in code block if multi-line)

4. **Large paste**:
   - Copy 15,000+ characters of text
   - Paste into chat input
   - **Expected**: Confirmation dialog shown

### Edge Cases

- [ ] Paste with cursor in middle of existing text
- [ ] Paste while IME is composing
- [ ] Paste multiple images at once
- [ ] Paste from Excel (tab-separated values)
- [ ] Paste from PDF (weird formatting)
- [ ] Paste URL only (should remain as link text)

### Unit Tests

```typescript
// __tests__/ChatInput.paste.test.tsx
describe('ChatInput paste handling', () => {
  it('strips HTML and inserts plain text', () => {
    render(<ChatInput conversationId="test" />);

    const textarea = screen.getByRole('textbox');

    // Simulate paste with HTML
    const pasteEvent = createEvent.paste(textarea, {
      clipboardData: {
        getData: (type: string) => {
          if (type === 'text/html') return '<b>Bold</b> text';
          if (type === 'text/plain') return 'Bold text';
          return '';
        },
        items: [],
        files: [],
      },
    });

    fireEvent(textarea, pasteEvent);

    expect(textarea).toHaveValue('Bold text');
  });

  it('handles image paste', async () => {
    const onAttachmentsChange = jest.fn();
    render(
      <ChatInput
        conversationId="test"
        onAttachmentsChange={onAttachmentsChange}
      />
    );

    const textarea = screen.getByRole('textbox');
    const imageFile = new File([''], 'screenshot.png', { type: 'image/png' });

    const pasteEvent = createEvent.paste(textarea, {
      clipboardData: {
        getData: () => '',
        items: [{
          type: 'image/png',
          getAsFile: () => imageFile,
        }],
        files: [imageFile],
      },
    });

    fireEvent(textarea, pasteEvent);

    await waitFor(() => {
      expect(onAttachmentsChange).toHaveBeenCalled();
    });
  });

  it('shows confirmation for large paste', () => {
    render(<ChatInput conversationId="test" />);

    const textarea = screen.getByRole('textbox');
    const largeText = 'x'.repeat(15000);

    const pasteEvent = createEvent.paste(textarea, {
      clipboardData: {
        getData: (type: string) => type === 'text/plain' ? largeText : '',
        items: [],
        files: [],
      },
    });

    fireEvent(textarea, pasteEvent);

    expect(screen.getByText(/large paste detected/i)).toBeInTheDocument();
    expect(screen.getByText(/15,000 characters/)).toBeInTheDocument();
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| HTML stripping | None | Automatic | Prevents XSS/display issues |
| Image paste | Broken/unclear | Working | Common workflow support |
| Large paste handling | Silent freeze | Warning dialog | User awareness |
| Code paste | HTML artifacts | Clean text | Developer workflow |

---

## Risk Assessment

- **Breaking Changes**: None - enhances default behavior
- **Browser Support**: Clipboard API 95%+
- **Security**: HTML stripping prevents XSS
- **Performance**: Large paste warning prevents UI freeze

---

## References

- **Sources**: claude/18-paste-handling.md, gemini-cli/feat-input-paste-handling.md
- **Clipboard API**: https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent
- **DataTransfer**: https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
- **Related Issues**: P2-input/01-draft-persistence.md, P2-input/02-ime-composition.md

### Common MIME Types

```typescript
'text/plain'         // Plain text
'text/html'          // HTML formatted
'text/uri-list'      // URLs
'image/png'          // PNG image
'image/jpeg'         // JPEG image
'Files'              // Generic files
```
