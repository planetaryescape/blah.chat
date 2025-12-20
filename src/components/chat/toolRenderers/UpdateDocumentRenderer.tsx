import { RefreshCw } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the updateDocument tool.
 * Shows update status and version info.
 */
export function UpdateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          {parsedArgs?.changeDescription || "Updating..."}
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>Updated to v{parsedResult.newVersion}</span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
