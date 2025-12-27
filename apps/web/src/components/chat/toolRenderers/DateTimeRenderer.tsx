import type { ToolRendererProps } from "./types";

/**
 * Renderer for the datetime tool.
 * Displays date/time operation and result.
 */
export function DateTimeRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {parsedArgs?.operation}
          {parsedArgs?.timezone && ` (${parsedArgs.timezone})`}
        </span>
      </div>
      {parsedResult && state !== "executing" && (
        <div className="font-medium">
          {parsedResult.formatted || parsedResult.readable}
        </div>
      )}
    </div>
  );
}
