import type { ToolRendererProps } from "./types";

/**
 * Renderer for the codeExecution tool.
 * Displays code, output (stdout/stderr), errors, and execution time.
 */
export function CodeExecutionRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  // Combine stdout and stderr for display, or show error if failed
  const getOutputContent = () => {
    if (!parsedResult) return null;

    // If execution failed, show the error
    if (parsedResult.success === false && parsedResult.error) {
      return parsedResult.error;
    }

    // Combine stdout and stderr
    const outputs: string[] = [];
    if (parsedResult.stdout) outputs.push(parsedResult.stdout);
    if (parsedResult.stderr) outputs.push(parsedResult.stderr);

    // Add result value if present
    if (parsedResult.result) {
      const resultStr = typeof parsedResult.result === 'string'
        ? parsedResult.result
        : JSON.stringify(parsedResult.result, null, 2);
      if (resultStr && resultStr !== outputs.join('\n')) {
        outputs.push(`Result: ${resultStr}`);
      }
    }

    return outputs.join('\n') || '(no output)';
  };

  const hasError = parsedResult?.success === false;

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {parsedArgs?.language || "Code"}
        </span>
        {hasError && (
          <span className="text-red-500 text-[10px]">Failed</span>
        )}
      </div>
      {parsedArgs?.code && (
        <pre className="bg-muted p-2 rounded text-[11px] overflow-x-auto max-h-32 overflow-y-auto">
          <code>{parsedArgs.code}</code>
        </pre>
      )}
      {parsedResult && state !== "executing" && (
        <div className="space-y-1">
          <div className="text-muted-foreground">
            {hasError ? "Error:" : "Output:"}
          </div>
          <pre className={`p-2 rounded text-[11px] max-h-48 overflow-y-auto ${
            hasError ? "bg-red-500/10 text-red-500" : "bg-muted"
          }`}>
            <code>{getOutputContent()}</code>
          </pre>
          {parsedResult.executionTime && !hasError && (
            <div className="text-muted-foreground text-[11px]">
              Executed in {parsedResult.executionTime}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
