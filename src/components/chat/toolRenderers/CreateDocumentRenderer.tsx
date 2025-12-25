import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { ArtifactCard } from "../ArtifactCard";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the createDocument tool.
 * Shows artifact card on success for easy canvas access.
 */
export function CreateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  const resultDocId = parsedResult?.documentId as
    | Id<"canvasDocuments">
    | undefined;

  // Show loading state while executing
  if (state === "executing") {
    return (
      <div className="text-xs flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Creating "{parsedArgs?.title}"...</span>
      </div>
    );
  }

  // Show error if failed
  if (parsedResult && !parsedResult.success) {
    return (
      <div className="text-xs text-destructive py-2">
        Failed to create document: {parsedResult.error}
      </div>
    );
  }

  // Show artifact card on success
  if (parsedResult?.success && resultDocId) {
    return (
      <div className="mt-2">
        <ArtifactCard
          documentId={resultDocId}
          title={parsedArgs?.title ?? "Document"}
          documentType={parsedArgs?.documentType ?? "prose"}
          language={parsedArgs?.language}
          version={1}
          lineCount={parsedResult.lineCount}
        />
      </div>
    );
  }

  // Fallback for partial states
  return null;
}
