import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchFiles tool.
 * Displays file chunk search results with content snippets.
 */
export function SearchFilesRenderer({
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
        {parsedResult?.totalResults !== undefined && state !== "executing" && (
          <span className="text-muted-foreground text-[10px]">
            ({parsedResult.totalResults} found)
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="py-1">
              <div className="flex items-center gap-2">
                {r.url ? (
                  <a
                    href={r.url}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.filename}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">
                    {r.filename}
                  </span>
                )}
                {r.page !== undefined && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                    p.{r.page}
                  </span>
                )}
                {r.score && (
                  <span className="text-[10px] text-muted-foreground">
                    {(parseFloat(r.score) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] line-clamp-2 font-mono bg-muted/50 p-1 rounded mt-0.5">
                {r.content?.substring(0, 200)}
                {r.content && r.content.length > 200 ? "..." : ""}
              </p>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No files found</div>
          )}
        </div>
      )}
    </div>
  );
}
