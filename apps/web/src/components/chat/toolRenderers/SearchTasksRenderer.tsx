import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchTasks tool.
 * Displays task search results with status badges and links.
 */
export function SearchTasksRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const results = parsedResult?.results || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "in_progress":
        return "text-blue-500";
      case "blocked":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-500/20 text-red-500";
      case "high":
        return "bg-orange-500/20 text-orange-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      default:
        return "bg-muted text-muted-foreground";
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
                  className="font-medium text-primary hover:underline"
                >
                  {r.title}
                </a>
                <span className={`text-[10px] ${getStatusColor(r.status)}`}>
                  {r.status?.replace("_", " ")}
                </span>
                {r.urgency && r.urgency !== "medium" && (
                  <span
                    className={`text-[9px] px-1 rounded ${getUrgencyBadge(r.urgency)}`}
                  >
                    {r.urgency}
                  </span>
                )}
              </div>
              {r.deadline && (
                <span className="text-[10px] text-muted-foreground">
                  Due: {new Date(r.deadline).toLocaleDateString()}
                </span>
              )}
              {r.description && (
                <p className="text-muted-foreground text-[11px] line-clamp-1">
                  {r.description}
                </p>
              )}
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No tasks found</div>
          )}
        </div>
      )}
    </div>
  );
}
