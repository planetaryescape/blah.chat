import type { ToolRendererProps } from "./types";

/**
 * Renderer for the webSearch tool.
 * Displays search results with links and snippets.
 */
export function WebSearchRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const results = parsedResult?.results || [];

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          "{parsedArgs?.query}"
        </span>
      </div>

      {parsedResult && state !== "executing" && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="py-1">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {r.title}
              </a>
              <p className="text-muted-foreground text-[11px] line-clamp-2">
                {r.content?.substring(0, 150)}
                {r.content && r.content.length > 150 ? "..." : ""}
              </p>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
