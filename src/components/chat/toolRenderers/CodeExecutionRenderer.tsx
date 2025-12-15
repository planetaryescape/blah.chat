import type { ToolRendererProps } from "./types";

/**
 * Renderer for the codeExecution tool.
 * Displays code, output, and execution time.
 */
export function CodeExecutionRenderer({
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
          {parsedArgs?.language || "Code"}
        </span>
      </div>
      {parsedArgs?.code && (
        <pre className="bg-muted p-2 rounded text-[11px] overflow-x-auto">
          <code>{parsedArgs.code}</code>
        </pre>
      )}
      {parsedResult && state !== "executing" && (
        <div className="space-y-1">
          <div className="text-muted-foreground">Output:</div>
          <pre className="bg-muted p-2 rounded text-[11px] max-h-48 overflow-y-auto">
            <code>{parsedResult.output}</code>
          </pre>
          {parsedResult.executionTime && (
            <div className="text-muted-foreground text-[11px]">
              Executed in {parsedResult.executionTime}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
