import type { ToolRendererProps } from "./types";

/**
 * Default renderer for unknown/unsupported tools.
 * Displays raw arguments and results as JSON.
 */
export function DefaultToolRenderer({
  call,
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
          {call.name || "Unknown tool"}
        </span>
      </div>

      {/* Show parsed arguments */}
      {parsedArgs && (
        <div className="text-muted-foreground">
          <div className="text-[11px] font-medium mb-1">Arguments:</div>
          <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(parsedArgs, null, 2)}
          </pre>
        </div>
      )}

      {/* Show parsed results */}
      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          <div className="text-[11px] font-medium mb-1">Result:</div>
          <pre className="text-[10px] bg-muted p-2 rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(parsedResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
