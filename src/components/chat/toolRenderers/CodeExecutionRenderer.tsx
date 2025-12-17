import type { ToolRendererProps } from "./types";

/**
 * Renderer for the codeExecution tool.
 * Displays code, output (stdout/stderr), errors, images, and execution time.
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
      const resultStr =
        typeof parsedResult.result === "string"
          ? parsedResult.result
          : JSON.stringify(parsedResult.result, null, 2);
      if (resultStr && resultStr !== outputs.join("\n")) {
        outputs.push(`Result: ${resultStr}`);
      }
    }

    return outputs.join("\n") || "(no output)";
  };

  const hasError = parsedResult?.success === false;
  const images = parsedResult?.images as
    | Array<{ url: string; storageId: string }>
    | undefined;

  return (
    <div className="text-xs space-y-2 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {parsedArgs?.language || "Code"}
        </span>
        {hasError && <span className="text-red-500 text-[10px]">Failed</span>}
      </div>
      {parsedArgs?.code && (
        <pre className="bg-muted p-2 rounded text-[11px] overflow-x-auto max-h-32 overflow-y-auto">
          <code>{parsedArgs.code}</code>
        </pre>
      )}
      {parsedResult && state !== "executing" && (
        <div className="space-y-2">
          {/* Images from code execution (matplotlib plots, etc.) */}
          {images && images.length > 0 && (
            <div className="space-y-2">
              {images.map((img, idx) => {
                // Debug log
                console.log("[CodeExecution] Rendering image:", img);

                if (!img.url) {
                  return (
                    <div
                      key={idx}
                      className="p-2 bg-yellow-500/10 text-yellow-600 rounded text-[11px]"
                    >
                      Image {idx + 1}: URL not available
                    </div>
                  );
                }

                return (
                  <div
                    key={img.storageId || idx}
                    className="rounded overflow-hidden border border-border/40 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Code execution output ${idx + 1}`}
                      className="w-full h-auto block"
                      loading="lazy"
                      onError={(e) => {
                        console.error(
                          "[CodeExecution] Image failed to load:",
                          img.url,
                        );
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Text output */}
          <div className="text-muted-foreground">
            {hasError ? "Error:" : "Output:"}
          </div>
          <pre
            className={`p-2 rounded text-[11px] max-h-48 overflow-y-auto ${
              hasError ? "bg-red-500/10 text-red-500" : "bg-muted"
            }`}
          >
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
