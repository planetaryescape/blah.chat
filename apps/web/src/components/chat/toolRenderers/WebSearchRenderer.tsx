import type { ToolRendererProps } from "./types";

/**
 * Renderer for webSearch and tavilySearch tools.
 * Displays search results with links and snippets.
 * Shows AI-generated answer from Tavily when available.
 */
export function WebSearchRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const results = parsedResult?.results || [];
  const answer = parsedResult?.answer; // Tavily's AI-generated answer

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
          {/* Show AI answer if available (from Tavily's includeAnswer option) */}
          {answer && (
            <div className="py-1.5 px-2 bg-muted/50 rounded-md border border-border/50">
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {answer}
              </p>
            </div>
          )}

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
          {results.length === 0 && !answer && (
            <div className="text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
