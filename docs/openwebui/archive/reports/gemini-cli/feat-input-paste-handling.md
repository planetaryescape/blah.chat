# Feature: Input Paste Handling (Images)

**Context:**
Users expect to paste screenshots directly into the chat input.

**The Issue:**
The `<Textarea>` component in `ChatInput.tsx` lacks an `onPaste` handler. It only accepts text.

**Target File:**
`apps/web/src/components/chat/ChatInput.tsx`

**Proposed Solution:**
Add a paste event handler to intercept image data.

**Implementation Details:**
```typescript
const handlePaste = (e: React.ClipboardEvent) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        // Reuse existing upload logic
        // You might need to expose the upload function from FileUpload or lift it up
        handleUpload([file]); 
      }
    }
  }
};
```
- Pass this handler to the `<Textarea>` component.
