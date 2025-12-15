import type { ToolRendererProps } from "./types";

/**
 * Renderer for the saveMemory tool.
 * Displays the saved content and status.
 */
export function SaveMemoryRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium text-muted-foreground">
          {state === "executing"
            ? "Saving..."
            : parsedResult?.success
              ? "Saved"
              : parsedResult?.duplicate
                ? "Already exists"
                : "Failed"}
        </span>
      </div>
      <div className="text-muted-foreground">
        {parsedArgs?.content && (
          <span className="italic">"{parsedArgs.content}"</span>
        )}
      </div>
      {parsedResult?.message && state !== "executing" && (
        <div
          className={
            parsedResult.success ? "text-green-500" : "text-amber-500"
          }
        >
          {parsedResult.message}
        </div>
      )}
    </div>
  );
}
