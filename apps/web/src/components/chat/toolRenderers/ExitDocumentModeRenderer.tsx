import type { ToolRendererProps } from "./types";

export function ExitDocumentModeRenderer({
  state,
  ToolIcon,
}: ToolRendererProps) {
  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {state === "executing" ? "Exiting..." : "Returned to chat"}
        </span>
      </div>
    </div>
  );
}
