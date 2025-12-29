import { FileText, Globe, StickyNote, Youtube } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Get icon for knowledge source type
 */
function getSourceIcon(type: string) {
  switch (type) {
    case "file":
      return FileText;
    case "text":
      return StickyNote;
    case "web":
      return Globe;
    case "youtube":
      return Youtube;
    default:
      return FileText;
  }
}

/**
 * Renderer for the searchKnowledgeBank tool.
 * Displays knowledge bank search results with source type icons and relevance scores.
 */
export function SearchKnowledgeBankRenderer({
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
        {parsedResult?.found !== undefined && state !== "executing" && (
          <span className="text-muted-foreground text-[10px]">
            ({parsedResult.found} found)
          </span>
        )}
      </div>

      {parsedResult && state !== "executing" && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.slice(0, 5).map((r: any, i: number) => {
            const SourceIcon = getSourceIcon(r.type);
            return (
              <div key={i} className="py-1">
                <div className="flex items-center gap-2">
                  <SourceIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {r.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded flex-shrink-0">
                    {r.type}
                  </span>
                  {r.relevance && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {r.relevance}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-[10px] ml-5">
                  {r.source}
                </p>
                <p className="text-muted-foreground text-[11px] line-clamp-2 font-mono bg-muted/50 p-1 rounded mt-0.5">
                  {r.content?.substring(0, 200)}
                  {r.content && r.content.length > 200 ? "..." : ""}
                </p>
              </div>
            );
          })}
          {results.length === 0 && (
            <div className="text-muted-foreground">
              {parsedResult?.message || "No knowledge found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
