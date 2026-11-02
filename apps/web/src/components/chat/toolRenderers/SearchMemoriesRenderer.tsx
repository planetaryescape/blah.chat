import type { ToolRendererProps } from "./types";

/**
 * Renderer for the searchMemories tool.
 * Displays search query and found memories.
 */
export function SearchMemoriesRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-muted-foreground">
          {parsedArgs?.query}
        </span>
      </div>

      {parsedResult && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {parsedResult.memories?.map((mem: any, i: number) => (
            <div key={i} className="py-0.5">
              <span className="font-medium text-primary">[{mem.category}]</span>{" "}
              <span className="text-muted-foreground">{mem.content}</span>
            </div>
          ))}
          {parsedResult.found === 0 && (
            <div className="text-muted-foreground">No memories found</div>
          )}
          {state === "error" && (
            <div className="text-red-500">
              {parsedResult.error || "Tool execution failed"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
