# Paste Handling

> **Priority**: P3 (Input)
> **Effort**: Medium (2-3 hours)
> **Impact**: Medium - Improves input experience for common paste scenarios

---

## Summary

Implement proper paste handling in the chat input to strip rich text formatting, handle image paste, and manage large paste operations gracefully.

---

## Current State

**File**: `apps/web/src/components/chat/ChatInput.tsx`

### Current Behavior

- Uses `react-dropzone` for file handling
- No explicit `onPaste` event handler
- Rich text pasted retains formatting (if browser allows)
- Image paste: unclear if handled

---

## Problem

### Paste Scenarios to Handle

1. **Rich text from web**: User copies from web page, gets HTML formatting
2. **Image from clipboard**: User screenshots (Cmd+Shift+4) and pastes
3. **Code from IDE**: May include syntax highlighting as HTML
4. **Large text**: User pastes entire document
5. **Mixed content**: Text with inline images

### Current Issues

- No HTML stripping - formatted text may cause display issues
- Image paste may not work consistently
- No feedback for large paste operations
- No paste preview/confirmation for images

---

## Solution

### 1. Add onPaste Handler

```typescript
// apps/web/src/components/chat/ChatInput.tsx

const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const clipboardData = e.clipboardData;

  // Check for images first
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

  // Check for files
  const files = Array.from(clipboardData.files);
  if (files.length > 0) {
    e.preventDefault();
    handleFilesPaste(files);
    return;
  }

  // Handle text - strip formatting
  const html = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');

  if (html && plainText) {
    // Has rich text - use plain text version
    e.preventDefault();
    insertTextAtCursor(plainText);
  }
  // If only plain text, let default behavior handle it

}, []);

// Helper to insert text at cursor position
const insertTextAtCursor = (text: string) => {
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
  });
};
```

### 2. Image Paste Handler

```typescript
const handleImagePaste = async (file: File) => {
  // Validate file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    toast.error('Image too large (max 10MB)');
    return;
  }

  // Show preview and confirm
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    // Could show confirmation dialog here
    // For now, just add to attachments
  };
  reader.readAsDataURL(file);

  // Add to attachments
  const attachment = await uploadFile(file);
  onAttachmentsChange([...attachments, attachment]);

  toast.success('Image added');
};
```

### 3. Large Paste Handling

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const text = e.clipboardData.getData('text/plain');

  // Warn for very large pastes
  const LARGE_PASTE_THRESHOLD = 10000; // characters
  if (text.length > LARGE_PASTE_THRESHOLD) {
    e.preventDefault();

    // Show confirmation dialog
    setLargePasteContent(text);
    setShowLargePasteDialog(true);
    return;
  }

  // Continue with normal handling...
}, []);

// Large paste dialog
<AlertDialog open={showLargePasteDialog} onOpenChange={setShowLargePasteDialog}>
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

### 4. Code Paste Detection

```typescript
const handlePaste = useCallback((e: React.ClipboardEvent) => {
  const html = e.clipboardData.getData('text/html');
  const plainText = e.clipboardData.getData('text/plain');

  // Detect if this looks like code from an IDE
  const looksLikeCode =
    html?.includes('class="hljs"') || // highlight.js
    html?.includes('class="token"') || // Prism
    html?.includes('data-language') ||
    /^\s*(function|const|let|var|import|export|class|def|fn)\s/.test(plainText);

  if (looksLikeCode) {
    e.preventDefault();
    // Wrap in code block
    const wrappedCode = '```\n' + plainText + '\n```';
    insertTextAtCursor(wrappedCode);
    return;
  }

  // Normal paste handling...
}, []);
```

### 5. Apply Changes to Textarea

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

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/chat/ChatInput.tsx` | Add onPaste handler |
| `apps/web/src/components/chat/LargePasteDialog.tsx` | Optional: create dialog |

---

## Testing

### Manual Testing

1. **Rich text paste**:
   - Copy formatted text from a webpage
   - Paste into chat input
   - **Expected**: Plain text inserted (no formatting)

2. **Image paste**:
   - Take a screenshot (Cmd+Shift+4 on Mac)
   - Paste into chat input
   - **Expected**: Image added to attachments

3. **Code paste**:
   - Copy code from VS Code
   - Paste into chat input
   - **Expected**: Plain text (or optionally wrapped in code block)

4. **Large paste**:
   - Copy 20,000+ characters
   - Paste into chat input
   - **Expected**: Confirmation dialog shown

### Edge Cases

- [ ] Paste with cursor in middle of existing text
- [ ] Paste while IME is composing
- [ ] Paste multiple images at once
- [ ] Paste from Excel (tab-separated values)
- [ ] Paste from PDF (may have weird formatting)

---

## References

### Clipboard API

```typescript
// Reading clipboard data
e.clipboardData.getData('text/plain');  // Plain text
e.clipboardData.getData('text/html');   // HTML formatted
e.clipboardData.files;                   // File objects
e.clipboardData.items;                   // DataTransferItems
```

### DataTransfer Item Types

```typescript
// Common MIME types
'text/plain'         // Plain text
'text/html'          // HTML
'text/uri-list'      // URLs
'image/png'          // PNG image
'image/jpeg'         // JPEG image
'Files'              // Generic files
```

---

## Notes

- **Always prefer plain text** - strip HTML to avoid XSS and display issues
- **Handle images gracefully** - screenshot paste is common workflow
- **Code detection is heuristic** - may have false positives
- **Large paste warning** - prevents accidental performance issues
- **Test cross-browser** - clipboard behavior varies
