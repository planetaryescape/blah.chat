import type { ToolRendererProps } from "./types";

/**
 * Renderer for the projectContext tool.
 * Displays project info and context items.
 */
export function ProjectContextRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const section = parsedArgs?.section || "context";
  const items = parsedResult?.items || [];

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {parsedResult?.project?.name} • {section}
        </span>
      </div>
      {items.length > 0 && state !== "executing" && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {items.map((item: any, i: number) => (
            <div key={i} className="text-muted-foreground">
              • {item.title || item.name || item.content?.substring(0, 50)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
