import type { ToolRendererProps } from "./types";

/**
 * Renderer for the deleteMemory tool.
 * Displays deletion status and message.
 */
export function DeleteMemoryRenderer({
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span
          className={parsedResult?.success ? "text-green-500" : "text-red-500"}
        >
          {parsedResult?.success ? "Deleted" : "Failed to delete"}
        </span>
      </div>
      {parsedResult?.message && state !== "executing" && (
        <div className="text-muted-foreground">{parsedResult.message}</div>
      )}
    </div>
  );
}
