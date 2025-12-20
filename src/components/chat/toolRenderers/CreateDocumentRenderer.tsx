import { FileCode, FileText } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the createDocument tool.
 * Shows document creation with type-specific icon.
 */
export function CreateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  const Icon = parsedArgs?.documentType === "code" ? FileCode : FileText;

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          "{parsedArgs?.title}"
        </span>
        {parsedArgs?.language && (
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
            {parsedArgs.language}
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span>Created • {parsedResult.lineCount} lines</span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
