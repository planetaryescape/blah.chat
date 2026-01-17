# Feature: Global Drag & Drop

**Context:**
Dropping files into the chat.

**The Issue:**
Drag and drop is currently scoped to the input area or specific drop zones. Users often drop files blindly into the browser window.

**Target File:**
`apps/web/src/app/layout.tsx` (or the main Chat page wrapper)

**Proposed Solution:**
Implement a window-level drop zone.

**Implementation Details:**
- Add a `dragenter` event listener to the `window` object.
- When active, render a full-screen overlay (z-index 50, backdrop-blur, dashed border) saying "Drop files to attach".
- On drop, capture the files and pass them to the `ChatInput` context/state.
