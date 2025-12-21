"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { DiffOperation } from "@/lib/canvas/diff";

export interface ConflictInfo {
  description: string;
  userContent: string;
  aiContent: string;
  lineRange?: { start: number; end: number };
  documentId: Id<"canvasDocuments">;
  pendingOperations: DiffOperation[];
}

interface CanvasContextType {
  documentId: Id<"canvasDocuments"> | null;
  setDocumentId: (id: Id<"canvasDocuments"> | null) => void;
  pendingConflict: ConflictInfo | null;
  setPendingConflict: (conflict: ConflictInfo | null) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (show: boolean) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [documentId, setDocumentId] = useState<Id<"canvasDocuments"> | null>(
    null,
  );
  const [pendingConflict, setPendingConflict] = useState<ConflictInfo | null>(
    null,
  );
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  return (
    <CanvasContext.Provider
      value={{
        documentId,
        setDocumentId,
        pendingConflict,
        setPendingConflict,
        showHistoryPanel,
        setShowHistoryPanel,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvasContext must be used within CanvasProvider");
  }
  return context;
}
