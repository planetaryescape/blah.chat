import type { ToolRendererProps } from "./types";

/**
 * Renderer for the fileDocument tool.
 * Displays file name, word count, and content.
 */
export function FileDocumentRenderer({
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">
          {parsedResult?.fileName || "Document"}
        </span>
      </div>
      {parsedResult && state !== "executing" && (
        <div className="space-y-1">
          <div className="text-muted-foreground text-[11px]">
            {parsedResult.wordCount} words
          </div>
          {parsedResult.content && (
            <div className="max-h-48 overflow-y-auto bg-muted p-2 rounded">
              <pre className="whitespace-pre-wrap font-sans text-[11px]">
                {parsedResult.content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
