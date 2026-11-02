import type { ToolRendererProps } from "./types";

/**
 * Renderer for the queryHistory tool.
 * Displays conversation history search results with message snippets.
 */
export function QueryHistoryRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const results = parsedResult?.results || [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "user":
        return "You";
      case "assistant":
        return "Assistant";
      case "system":
        return "System";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "user":
        return "text-blue-500";
      case "assistant":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

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
                <a
                  href={r.url}
                  className="font-medium text-primary hover:underline truncate max-w-[200px]"
                >
                  {r.conversationTitle || "Untitled conversation"}
                </a>
                <span className={`text-[10px] ${getRoleColor(r.role)}`}>
                  {getRoleLabel(r.role)}
                </span>
                {r.timestamp && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] line-clamp-2">
                {r.content?.substring(0, 150)}
                {r.content && r.content.length > 150 ? "..." : ""}
              </p>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No conversations found</div>
          )}
        </div>
      )}
    </div>
  );
}
