import { useEffect, useRef } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface UseCanvasAutoSyncOptions {
  conversationId: Id<"conversations">;
  isDocumentMode: boolean;
  documentId: Id<"canvasDocuments"> | null;
  activeCanvasDocumentId: Id<"canvasDocuments"> | undefined;
  setDocumentId: (id: Id<"canvasDocuments"> | null) => void;
}

/**
 * Manages canvas panel state in sync with conversation mode and navigation.
 *
 * Handles three scenarios:
 * 1. Auto-close canvas when exiting document mode
 * 2. Clear canvas when switching conversations
 * 3. Auto-open canvas when conversation has an active document in document mode
 */
export function useCanvasAutoSync({
  conversationId,
  isDocumentMode,
  documentId,
  activeCanvasDocumentId,
  setDocumentId,
}: UseCanvasAutoSyncOptions) {
  const prevConversationIdRef = useRef(conversationId);

  // Auto-close Canvas when exiting document mode
  useEffect(() => {
    if (!isDocumentMode && documentId) {
      setDocumentId(null);
    }
  }, [isDocumentMode, documentId, setDocumentId]);

  // Clear Canvas when switching conversations
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      if (documentId) {
        setDocumentId(null);
      }
    }
  }, [conversationId, documentId, setDocumentId]);

  // Auto-open canvas panel when conversation has an active document AND is in document mode
  useEffect(() => {
    if (activeCanvasDocumentId && !documentId && isDocumentMode) {
      setDocumentId(activeCanvasDocumentId);
    }
  }, [activeCanvasDocumentId, documentId, setDocumentId, isDocumentMode]);
}
