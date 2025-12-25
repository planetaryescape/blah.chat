import { Check, FileCode, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the createDocument tool.
 * Shows compact tool info. Artifact card appears in message body via ArtifactList.
 */
export function CreateDocumentRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  const Icon = parsedArgs?.documentType === "code" ? FileCode : FileText;

  // Show loading state while executing
  if (state === "executing") {
    return (
      <div className="text-xs flex items-center gap-2 text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Creating "{parsedArgs?.title}"...</span>
      </div>
    );
  }

  // Show error if failed
  if (parsedResult && !parsedResult.success) {
    return (
      <div className="text-xs text-destructive py-1">
        Failed: {parsedResult.error}
      </div>
    );
  }

  // Show success info
  if (parsedResult?.success) {
    return (
      <div className="text-xs flex items-center gap-2 py-1">
        <div className="flex items-center gap-1.5 text-green-500">
          <Check className="h-3 w-3" />
          <span>Created</span>
        </div>
        <span className="text-muted-foreground/50">·</span>
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground truncate max-w-[200px]">
          {parsedArgs?.title ?? "Document"}
        </span>
        {parsedArgs?.language && (
          <Badge variant="secondary" className="h-4 text-[10px] px-1">
            {parsedArgs.language}
          </Badge>
        )}
        {parsedResult.lineCount && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">
              {parsedResult.lineCount} lines
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}
