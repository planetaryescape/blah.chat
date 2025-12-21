import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the resolveConflict tool.
 * Shows conflict resolution strategy and status.
 */
export function ResolveConflictRenderer({
  parsedArgs,
  parsedResult,
  state,
}: ToolRendererProps) {
  const strategy = parsedArgs?.strategy;

  const getStrategyIcon = () => {
    switch (strategy) {
      case "retry_with_read":
        return <RefreshCw className="h-3 w-3 text-blue-500" />;
      case "force_replace":
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
      case "ask_user":
        return <HelpCircle className="h-3 w-3 text-purple-500" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStrategyLabel = () => {
    switch (strategy) {
      case "retry_with_read":
        return "Retrying with fresh read";
      case "force_replace":
        return "Force replacing";
      case "ask_user":
        return "Asking for user input";
      default:
        return "Resolving conflict";
    }
  };

  return (
    <div className="text-xs space-y-1 border-l-2 border-yellow-500/40 pl-3">
      <div className="flex items-center gap-2">
        {getStrategyIcon()}
        <span className="font-mono text-muted-foreground">
          {getStrategyLabel()}
        </span>
      </div>

      {parsedArgs?.conflictDescription && (
        <div className="text-muted-foreground/80 text-[10px]">
          {parsedArgs.conflictDescription}
        </div>
      )}

      {parsedResult && state !== "executing" && (
        <div className="text-muted-foreground">
          {parsedResult.success ? (
            <span className="text-[10px]">{parsedResult.message}</span>
          ) : (
            <span className="text-destructive">{parsedResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
