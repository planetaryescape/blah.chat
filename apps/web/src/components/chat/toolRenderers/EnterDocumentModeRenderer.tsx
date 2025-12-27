import type { ToolRendererProps } from "./types";

export function EnterDocumentModeRenderer({
  parsedArgs,
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {state === "executing"
            ? "Entering document mode..."
            : "Document mode active"}
        </span>
      </div>
      {parsedArgs?.reason && state !== "executing" && (
        <div className="text-muted-foreground/80 text-[10px]">
          {parsedArgs.reason}
        </div>
      )}
    </div>
  );
}
