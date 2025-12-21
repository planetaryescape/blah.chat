/**
 * Document Mode Prompts
 *
 * System prompt injected when Canvas is in document mode.
 * Used by: generation.ts when conversation.mode === "document"
 */

export const DOCUMENT_MODE_PROMPT = `## Document Mode Active

Canvas editor is open. Available tools:
- createDocument: Start new document
- updateDocument: Apply diff operations
- readDocument: Get current content
- exitDocumentMode: Return to chat when done

Use diffs for updates, not full rewrites.`;
