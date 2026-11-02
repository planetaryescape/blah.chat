import { HelpCircle } from "lucide-react";
import type { ToolRendererProps } from "./types";

/**
 * Renderer for the askForClarification tool.
 * Displays a prominent clarification request with optional multiple choice options.
 */
export function AskForClarificationRenderer({
  parsedResult,
  state,
}: ToolRendererProps) {
  const clarification = parsedResult?.clarification;
  if (!clarification || state === "executing") return null;

  return (
    <div className="border-l-4 border-amber-500 bg-amber-500/10 p-4 rounded-r-lg my-2">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="h-4 w-4 text-amber-500" />
        <span className="font-semibold text-amber-500">
          Clarification Needed
        </span>
      </div>

      {clarification.context && (
        <p className="text-sm text-muted-foreground mb-2">
          {clarification.context}
        </p>
      )}

      <p className="font-medium mb-3">{clarification.question}</p>

      {clarification.options && clarification.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {clarification.options.map((opt: string) => (
            <span
              key={opt}
              className="px-3 py-1.5 rounded-full bg-amber-500/20 text-sm font-medium"
            >
              {opt}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Reply below to answer...
      </p>
    </div>
  );
}
