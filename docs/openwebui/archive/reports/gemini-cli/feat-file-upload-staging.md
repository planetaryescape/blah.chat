# Feature: File Upload "Staging"

**Context:**
File uploads currently trigger an immediate save to the database.

**The Issue:**
If a user drops a file by mistake and deletes it, it remains as an orphaned record in the DB/Storage. It also forces a network wait before the user feels the file is "attached".

**Target File:**
`apps/web/src/components/chat/FileUpload.tsx` (and parent `ChatInput.tsx`)

**Proposed Solution:**
Implement a "Staging" state.

**Implementation Details:**
1.  **Immediate Preview:** On file drop, use `URL.createObjectURL(file)` to generate a local preview URL and display it in `AttachmentPreview` immediately.
2.  **Pending State:** Store the raw `File` object in a `pendingAttachments` state array.
3.  **Defer Upload:**
    - **Option A:** Upload in background but mark as "temporary" in DB. Confirm on "Send".
    - **Option B (Simpler):** Don't upload until the user clicks "Send". Show a progress bar during the send phase.
