"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookmarkPlus,
  Calculator,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code,
  ExternalLink,
  FileText,
  FolderTree,
  Globe,
  Loader2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  DefaultToolRenderer,
  getCallState,
  type ToolCall,
  toolRenderers,
} from "./toolRenderers";

interface ToolCallDisplayProps {
  toolCalls?: ToolCall[];
  partialToolCalls?: (Omit<ToolCall, "result"> & { result?: string })[];
}

/**
 * Get the icon for a tool by name.
 */
function getToolIcon(toolName: string) {
  switch (toolName) {
    case "saveMemory":
      return BookmarkPlus;
    case "searchMemories":
      return Search;
    case "calculator":
      return Calculator;
    case "datetime":
      return Calendar;
    case "webSearch":
      return Globe;
    case "urlReader":
      return ExternalLink;
    case "fileDocument":
      return FileText;
    case "codeExecution":
      return Code;
    case "weather":
      return Cloud;
    case "projectContext":
      return FolderTree;
    case "manageTasks":
      return CheckSquare;
    default:
      return Search;
  }
}

/**
 * Get a human-readable label for a tool call state.
 */
function getToolLabel(
  toolName: string,
  isExecuting: boolean,
  result: any,
): string {
  switch (toolName) {
    case "saveMemory":
      if (isExecuting) return "Saving to memory...";
      if (result?.success === false) return "Failed to save";
      if (result?.duplicate) return "Already saved";
      return "Saved to memory";
    case "searchMemories":
      if (isExecuting) return "Searching memories...";
      return `Memory search (${result?.found || 0} result${result?.found !== 1 ? "s" : ""})`;
    case "calculator":
      if (isExecuting) return "Calculating...";
      if (result?.success === false) return "Calculation error";
      return `= ${result?.result}`;
    case "datetime":
      if (isExecuting) return "Getting date/time...";
      if (result?.success === false) return "Date error";
      if (result?.formatted) return result.formatted;
      if (result?.readable) return result.readable;
      return "Date/time";
    case "webSearch":
      if (isExecuting) return "Searching the web...";
      if (result?.success === false) return "Search failed";
      return `Web search (${result?.results?.length || 0} result${result?.results?.length !== 1 ? "s" : ""})`;
    case "urlReader":
      if (isExecuting) return "Reading URL...";
      if (result?.success === false) return "Failed to read URL";
      return `Read ${result?.url || "URL"} (${result?.wordCount || 0} words)`;
    case "fileDocument":
      if (isExecuting) return "Processing document...";
      if (result?.success === false) return "Failed to process file";
      return `${result?.fileName || "Document"} (${result?.wordCount || 0} words)`;
    case "codeExecution":
      if (isExecuting) return "Executing code...";
      if (result?.success === false) return "Execution failed";
      return `${result?.language || "Code"} executed (${result?.executionTime || 0}ms)`;
    case "weather": {
      if (isExecuting) return "Fetching weather...";
      if (result?.success === false) return "Weather unavailable";
      const temp = result?.current?.temperature;
      const units = result?.units === "fahrenheit" ? "°F" : "°C";
      return result?.location
        ? `${result.location} • ${temp}${units}`
        : "Weather Forecast";
    }
    case "projectContext": {
      if (isExecuting) return "Loading project context...";
      if (result?.success === false) return "Project not found";
      const section = result?.section || "context";
      if (section === "context") {
        return `Project: ${result?.project?.name || "Unknown"}`;
      } else if (section === "notes") {
        return `${result?.totalCount || 0} project note${result?.totalCount !== 1 ? "s" : ""}`;
      } else if (section === "files") {
        return `${result?.totalCount || 0} project file${result?.totalCount !== 1 ? "s" : ""}`;
      } else if (section === "history") {
        return `${result?.totalCount || 0} conversation${result?.totalCount !== 1 ? "s" : ""}`;
      }
      return "Project context";
    }
    case "manageTasks": {
      if (isExecuting) return "Managing tasks...";
      if (result?.success === false)
        return result?.message || "Task operation failed";
      const op = result?.operation;
      if (op === "create") return `Created: ${result?.task?.title || "task"}`;
      if (op === "complete")
        return `Completed: ${result?.task?.title || "task"}`;
      if (op === "delete")
        return result?.deleted ? "Task deleted" : "Ready to delete";
      if (op === "update") return `Updated: ${result?.task?.title || "task"}`;
      if (op === "list")
        return `${result?.totalCount || 0} task${result?.totalCount !== 1 ? "s" : ""}`;
      return "Task manager";
    }
    default:
      if (isExecuting) return "Processing...";
      return "Done";
  }
}

export function ToolCallDisplay({
  toolCalls,
  partialToolCalls,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Merge partial (loading) and complete calls
  const uniqueCalls = useMemo(() => {
    const combined = [...(toolCalls || [])];

    if (partialToolCalls) {
      for (const partial of partialToolCalls) {
        if (!combined.some((c) => c.id === partial.id)) {
          combined.push(partial as ToolCall);
        }
      }
    }
    return combined;
  }, [toolCalls, partialToolCalls]);

  if (uniqueCalls.length === 0) return null;

  const anyExecuting = uniqueCalls.some((c) => getCallState(c) === "executing");
  const hasError = uniqueCalls.some((c) => getCallState(c) === "error");
  const isAnyExpanded = Object.values(expanded).some(Boolean);

  // Get summary info for collapsed view
  const getSummaryInfo = () => {
    const searchCalls = uniqueCalls.filter((c) => c.name === "searchMemories");
    const saveCalls = uniqueCalls.filter((c) => c.name === "saveMemory");

    // Calculate total search results
    const totalResults = searchCalls.reduce((sum, call) => {
      if (call.result) {
        try {
          const parsed = JSON.parse(call.result);
          return sum + (parsed.found || 0);
        } catch {}
      }
      return sum;
    }, 0);

    // Count successful saves
    const savedCount = saveCalls.filter((c) => {
      try {
        const parsed = JSON.parse(c.result || "{}");
        return parsed.success === true;
      } catch {
        return false;
      }
    }).length;

    if (anyExecuting) {
      const executingCall = uniqueCalls.find(
        (c) => getCallState(c) === "executing",
      );
      return getToolLabel(executingCall?.name || "", true, null);
    }

    const parts = [];
    if (searchCalls.length > 0) {
      parts.push(
        `${totalResults} memor${totalResults !== 1 ? "ies" : "y"} found`,
      );
    }
    if (saveCalls.length > 0) {
      parts.push(`${savedCount} saved`);
    }
    return parts.join(", ") || "Tool calls";
  };

  const toggleExpand = () => {
    const newState = !isAnyExpanded;
    const newExpanded: Record<string, boolean> = {};
    for (const call of uniqueCalls) {
      newExpanded[call.id] = newState;
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="my-3">
      {/* Collapsed summary view */}
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-expanded={isAnyExpanded}
        aria-label={`${uniqueCalls.length} tool call${uniqueCalls.length === 1 ? "" : "s"}`}
      >
        {/* Status indicator */}
        {anyExecuting ? (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        ) : hasError ? (
          <AlertCircle className="h-3 w-3 text-red-500" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}

        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {getSummaryInfo()}
        </span>

        <div className="flex-1 border-t border-dashed border-border/40 group-hover:border-border/60 transition-colors" />

        {isAnyExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isAnyExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 pl-2">
              {uniqueCalls.map((call) => {
                const state = getCallState(call);
                const ToolIcon = getToolIcon(call.name);

                let parsedArgs: any;
                let parsedResult: any;
                try {
                  parsedArgs = JSON.parse(call.arguments);
                  parsedResult = call.result ? JSON.parse(call.result) : null;
                } catch {
                  parsedArgs = call.arguments;
                  parsedResult = call.result;
                }

                // Get the renderer for this tool, or use the default
                const Renderer =
                  toolRenderers[call.name] || DefaultToolRenderer;

                return (
                  <Renderer
                    key={call.id}
                    call={call}
                    parsedArgs={parsedArgs}
                    parsedResult={parsedResult}
                    state={state}
                    ToolIcon={ToolIcon}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
