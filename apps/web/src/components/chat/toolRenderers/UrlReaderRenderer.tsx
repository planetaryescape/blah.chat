import type { ToolRendererProps } from "./types";

/**
 * Renderer for the urlReader tool.
 * Displays URL, word count, and content preview.
 */
export function UrlReaderRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const content = parsedResult?.content || "";
  const truncated = content.substring(0, 500);

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <a
          href={parsedArgs?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate"
        >
          {parsedArgs?.url}
        </a>
      </div>
      {parsedResult && state !== "executing" && (
        <div className="space-y-1">
          <div className="text-muted-foreground text-[11px]">
            {parsedResult.wordCount} words
          </div>
          <div className="max-h-48 overflow-y-auto text-muted-foreground">
            <pre className="whitespace-pre-wrap font-sans text-[11px]">
              {content.length > 500 ? `${truncated}...` : content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
