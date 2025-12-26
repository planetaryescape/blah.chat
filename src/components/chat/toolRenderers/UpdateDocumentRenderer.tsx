import { Check, Loader2, RefreshCw } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the updateDocument tool.
 * Shows compact update status. Artifact card appears in message body via ArtifactList.
 */
export function UpdateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  // Loading state
  if (state === "executing") {
    return (
      <div className="text-xs flex items-center gap-2 text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{parsedArgs?.changeDescription || "Updating document..."}</span>
      </div>
    );
  }

  // Error state
  if (parsedResult && !parsedResult.success) {
    return (
      <div className="text-xs text-destructive py-1">
        Failed: {parsedResult.error}
      </div>
    );
  }

  // Success state - compact inline display
  if (parsedResult?.success) {
    return (
      <div className="text-xs flex items-center gap-2 py-1">
        <div className="flex items-center gap-1.5 text-green-500">
          <Check className="h-3 w-3" />
          <span>Updated to v{parsedResult.newVersion}</span>
        </div>
        {parsedArgs?.changeDescription && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[200px]">
              {parsedArgs.changeDescription}
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}
