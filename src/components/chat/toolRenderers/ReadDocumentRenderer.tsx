import { Eye } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the readDocument tool.
 * Shows document read status.
 */
export function ReadDocumentRenderer({
  parsedResult,
  state,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <Eye className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          Reading document...
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.hasDocument ? (
            <span>
              {parsedResult.title || "Document"} • {parsedResult.lineCount}{" "}
              lines
            </span>
          ) : (
            <span>No document open</span>
          )}
        </div>
      )}
    </div>
  );
}
