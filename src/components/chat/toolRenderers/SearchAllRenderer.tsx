import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchAll tool.
 * Displays aggregated search results across notes, tasks, files, and conversations.
 */
export function SearchAllRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "notes":
        return "bg-purple-500/20 text-purple-500";
      case "tasks":
        return "bg-blue-500/20 text-blue-500";
      case "files":
        return "bg-green-500/20 text-green-500";
      case "conversations":
        return "bg-orange-500/20 text-orange-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "notes":
        return "Note";
      case "tasks":
        return "Task";
      case "files":
        return "File";
      case "conversations":
        return "Chat";
      default:
        return type;
    }
  };

  // Aggregate all results with type labels
  const allResults: Array<{ type: string; item: any }> = [];

  if (parsedResult?.notes?.results) {
    parsedResult.notes.results.forEach((item: any) => {
      allResults.push({ type: "notes", item });
    });
  }
  if (parsedResult?.tasks?.results) {
    parsedResult.tasks.results.forEach((item: any) => {
      allResults.push({ type: "tasks", item });
    });
  }
  if (parsedResult?.files?.results) {
    parsedResult.files.results.forEach((item: any) => {
      allResults.push({ type: "files", item });
    });
  }
  if (parsedResult?.conversations?.results) {
    parsedResult.conversations.results.forEach((item: any) => {
      allResults.push({ type: "conversations", item });
    });
  }

  // Count totals per type
  const totals = {
    notes: parsedResult?.notes?.totalResults || 0,
    tasks: parsedResult?.tasks?.totalResults || 0,
    files: parsedResult?.files?.totalResults || 0,
    conversations: parsedResult?.conversations?.totalResults || 0,
  };
  const totalCount = totals.notes + totals.tasks + totals.files + totals.conversations;

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2 flex-wrap">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          "{parsedArgs?.query}"
        </span>
        {state !== "executing" && totalCount > 0 && (
          <span className="text-muted-foreground text-[10px]">
            ({totalCount} total)
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {allResults.slice(0, 8).map(({ type, item }, i) => (
            <div key={i} className="py-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded ${getTypeColor(type)}`}
                >
                  {getTypeLabel(type)}
                </span>
                {item.url ? (
                  <a
                    href={item.url}
                    className="font-medium text-primary hover:underline truncate max-w-[200px]"
                  >
                    {item.title || item.filename || item.conversationTitle || "Untitled"}
                  </a>
                ) : (
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {item.title || item.filename || item.conversationTitle || "Untitled"}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] line-clamp-1 pl-10">
                {(item.preview || item.content || item.description || "")?.substring(0, 100)}
              </p>
            </div>
          ))}
          {allResults.length === 0 && (
            <div className="text-muted-foreground">No results found</div>
          )}
          {allResults.length > 8 && (
            <div className="text-muted-foreground text-[10px] pt-1">
              +{allResults.length - 8} more results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
