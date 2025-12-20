"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface CanvasContextType {
  documentId: Id<"canvasDocuments"> | null;
  setDocumentId: (id: Id<"canvasDocuments"> | null) => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [documentId, setDocumentId] = useState<Id<"canvasDocuments"> | null>(
    null,
  );

  return (
    <CanvasContext.Provider value={{ documentId, setDocumentId }}>
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
