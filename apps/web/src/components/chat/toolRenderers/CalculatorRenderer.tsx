import type { ToolRendererProps } from "./types";

/**
 * Renderer for the calculator tool.
 * Displays expression and result.
 */
export function CalculatorRenderer({
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
          {parsedArgs?.expression}
        </span>
      </div>
      {parsedResult && state !== "executing" && (
        <div className="font-semibold text-primary">
          = {parsedResult.result}
        </div>
      )}
    </div>
  );
}
