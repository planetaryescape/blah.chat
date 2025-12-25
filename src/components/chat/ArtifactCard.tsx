"use client";

import { ChevronRight, FileCode, FileText } from "lucide-react";
import { useCanvasContext } from "@/contexts/CanvasContext";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ArtifactCardProps {
  documentId: Id<"canvasDocuments">;
  title: string;
  documentType: "code" | "prose";
  language?: string;
  version?: number;
  lineCount?: number;
  className?: string;
}

/**
 * Claude-style artifact card that appears at the bottom of messages.
 * Clicking opens/closes the canvas panel.
 */
export function ArtifactCard({
  documentId,
  title,
  documentType,
  language,
  version,
  lineCount,
  className,
}: ArtifactCardProps) {
  const { documentId: openDocumentId, setDocumentId } = useCanvasContext();
  const isOpen = openDocumentId === documentId;

  const handleToggle = () => {
    if (isOpen) {
      setDocumentId(null);
    } else {
      setDocumentId(documentId);
    }
  };

  const Icon = documentType === "code" ? FileCode : FileText;
  const subtitle = language ?? (documentType === "code" ? "Code" : "Document");

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        "hover:bg-accent/50 transition-colors w-full max-w-sm text-left",
        isOpen && "ring-2 ring-primary/50 border-primary/50",
        className,
      )}
    >
      <div
        className={cn(
          "p-2 rounded-md",
          documentType === "code" ? "bg-blue-500/10" : "bg-amber-500/10",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            documentType === "code" ? "text-blue-500" : "text-amber-500",
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>{subtitle}</span>
          {version && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>v{version}</span>
            </>
          )}
          {lineCount && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{lineCount} lines</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform shrink-0",
          isOpen && "rotate-90",
        )}
      />
    </button>
  );
}
