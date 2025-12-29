import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchAll tool.
 * Displays aggregated search results across notes, tasks, files, conversations, and knowledge bank.
 * Handles flat array response with `source` field.
 */
export function SearchAllRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const getTypeColor = (source: string) => {
    switch (source) {
      case "notes":
        return "bg-purple-500/20 text-purple-500";
      case "tasks":
        return "bg-blue-500/20 text-blue-500";
      case "files":
        return "bg-green-500/20 text-green-500";
      case "conversations":
        return "bg-orange-500/20 text-orange-500";
      case "knowledgeBank":
        return "bg-cyan-500/20 text-cyan-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeLabel = (source: string) => {
    switch (source) {
      case "notes":
        return "Note";
      case "tasks":
        return "Task";
      case "files":
        return "File";
      case "conversations":
        return "Chat";
      case "knowledgeBank":
        return "KB";
      default:
        return source;
    }
  };

  // Results from flat array format (new)
  const results: Array<{ source: string; item: any }> =
    parsedResult?.results?.map((item: any) => ({
      source: item.source,
      item,
    })) ?? [];

  const totalCount = parsedResult?.totalResults ?? results.length;

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
          {results.slice(0, 8).map(({ source, item }, i) => (
            <div key={i} className="py-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded ${getTypeColor(source)}`}
                >
                  {getTypeLabel(source)}
                </span>
                {item.url ? (
                  <a
                    href={item.url}
                    className="font-medium text-primary hover:underline truncate max-w-[200px]"
                  >
                    {item.title ||
                      item.filename ||
                      item.conversationTitle ||
                      item.sourceTitle ||
                      "Untitled"}
                  </a>
                ) : (
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {item.title ||
                      item.filename ||
                      item.conversationTitle ||
                      item.sourceTitle ||
                      "Untitled"}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] line-clamp-1 pl-10">
                {(
                  item.preview ||
                  item.content ||
                  item.description ||
                  ""
                )?.substring(0, 100)}
              </p>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-muted-foreground">No results found</div>
          )}
          {results.length > 8 && (
            <div className="text-muted-foreground text-[10px] pt-1">
              +{results.length - 8} more results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
