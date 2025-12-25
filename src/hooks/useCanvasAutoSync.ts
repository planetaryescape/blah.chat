import { useCallback, useEffect, useRef } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface UseCanvasAutoSyncOptions {
  conversationId: Id<"conversations">;
  isDocumentMode: boolean;
  documentId: Id<"canvasDocuments"> | null;
  activeCanvasDocumentId: Id<"canvasDocuments"> | undefined;
  setDocumentId: (id: Id<"canvasDocuments"> | null) => void;
}

interface UseCanvasAutoSyncReturn {
  handleClose: () => void;
}

/**
 * Manages canvas panel state in sync with conversation mode and navigation.
 *
 * Handles scenarios:
 * 1. Auto-close canvas when exiting document mode
 * 2. Clear canvas when switching conversations
 * 3. Auto-open canvas when conversation has an active document in document mode
 * 4. Respect user's manual close action (don't auto-reopen until conversation changes)
 */
export function useCanvasAutoSync({
  conversationId,
  isDocumentMode,
  documentId,
  activeCanvasDocumentId,
  setDocumentId,
}: UseCanvasAutoSyncOptions): UseCanvasAutoSyncReturn {
  const prevConversationIdRef = useRef(conversationId);
  const userClosedRef = useRef(false);

  // Handle manual close - sets flag to prevent auto-reopen
  const handleClose = useCallback(() => {
    userClosedRef.current = true;
    setDocumentId(null);
  }, [setDocumentId]);

  // Auto-close Canvas when exiting document mode
  useEffect(() => {
    if (!isDocumentMode && documentId) {
      setDocumentId(null);
    }
  }, [isDocumentMode, documentId, setDocumentId]);

  // Clear Canvas and reset flag when switching conversations
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      userClosedRef.current = false; // Reset on conversation change
      if (documentId) {
        setDocumentId(null);
      }
    }
  }, [conversationId, documentId, setDocumentId]);

  // Auto-open canvas panel when conversation has an active document AND is in document mode
  // BUT only if user hasn't manually closed it
  useEffect(() => {
    if (
      activeCanvasDocumentId &&
      !documentId &&
      isDocumentMode &&
      !userClosedRef.current
    ) {
      setDocumentId(activeCanvasDocumentId);
    }
  }, [activeCanvasDocumentId, documentId, setDocumentId, isDocumentMode]);

  return { handleClose };
}
