import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchNotes tool.
 * Displays note search results with clickable links.
 */
export function SearchNotesRenderer({
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
              <a
                href={r.url}
                className="font-medium text-primary hover:underline"
              >
                {r.title || "Untitled"}
              </a>
              {r.tags?.length > 0 && (
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {r.tags.slice(0, 3).map((tag: string) => `#${tag}`).join(" ")}
                </span>
              )}
              <p className="text-muted-foreground text-[11px] line-clamp-2">
                {r.preview?.substring(0, 150)}
                {r.preview && r.preview.length > 150 ? "..." : ""}
              </p>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No notes found</div>
          )}
        </div>
      )}
    </div>
  );
}
