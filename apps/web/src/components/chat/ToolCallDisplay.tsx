"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookmarkPlus,
  Calculator,
  Calendar,
  CheckSquare,
  ChevronRight,
  Cloud,
  Code,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  FolderTree,
  Globe,
  History,
  Library,
  MessageSquare,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
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
    case "tavilySearch":
    case "tavilyAdvancedSearch":
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
    // Canvas tools
    case "createDocument":
      return FileText;
    case "updateDocument":
      return RefreshCw;
    case "readDocument":
      return Eye;
    // Document mode tools
    case "enterDocumentMode":
      return FileEdit;
    case "exitDocumentMode":
      return MessageSquare;
    // Memory tools
    case "deleteMemory":
      return Trash2;
    // Search tools
    case "searchFiles":
      return FileText;
    case "searchNotes":
      return StickyNote;
    case "searchTasks":
      return CheckSquare;
    case "queryHistory":
      return History;
    case "searchAll":
      return Search;
    case "searchKnowledgeBank":
      return Library;
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
    case "tavilySearch":
    case "tavilyAdvancedSearch":
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
    // Canvas tools
    case "createDocument":
      if (isExecuting) return "Creating document...";
      if (result?.success === false) return "Failed to create";
      return `Created "${result?.title || "document"}"`;
    case "updateDocument":
      if (isExecuting) return "Updating document...";
      if (result?.success === false) return "Update failed";
      return `Updated to v${result?.newVersion}`;
    case "readDocument":
      if (isExecuting) return "Reading document...";
      if (!result?.hasDocument) return "No document";
      return `Read (${result?.lineCount} lines)`;
    case "enterDocumentMode":
      if (isExecuting) return "Entering document mode...";
      if (result?.success === false) return "Mode switch failed";
      return "Document mode";
    case "exitDocumentMode":
      if (isExecuting) return "Exiting...";
      if (result?.success === false) return "Exit failed";
      return "Back to chat";
    // Memory tools
    case "deleteMemory":
      if (isExecuting) return "Deleting memory...";
      if (result?.success === false) return "Delete failed";
      return "Memory deleted";
    // Search tools
    case "searchFiles":
      if (isExecuting) return "Searching files...";
      return `File search (${result?.totalResults || 0} found)`;
    case "searchNotes":
      if (isExecuting) return "Searching notes...";
      return `Note search (${result?.totalResults || 0} found)`;
    case "searchTasks":
      if (isExecuting) return "Searching tasks...";
      return `Task search (${result?.totalResults || 0} found)`;
    case "queryHistory":
      if (isExecuting) return "Searching history...";
      return `History (${result?.totalResults || 0} found)`;
    case "searchAll":
      if (isExecuting) return "Searching everything...";
      return `Search all (${result?.totalCount || 0} found)`;
    case "searchKnowledgeBank":
      if (isExecuting) return "Searching knowledge bank...";
      return `Knowledge bank (${result?.found || 0} found)`;
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

  const isAnyExpanded = Object.values(expanded).some(Boolean);

  const toggleExpand = () => {
    const newState = !isAnyExpanded;
    const newExpanded: Record<string, boolean> = {};
    for (const call of uniqueCalls) {
      newExpanded[call.id] = newState;
    }
    setExpanded(newExpanded);
  };

  const toggleTool = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="my-3">
      {/* Bulk toggle header (only show if multiple tools) */}
      {uniqueCalls.length > 1 && (
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>
            {uniqueCalls.length} tool call{uniqueCalls.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={toggleExpand}
            className="hover:text-foreground transition-colors"
          >
            {isAnyExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* Timeline nodes */}
      <div className="space-y-0">
        {uniqueCalls.map((call, index) => {
          const isLast = index === uniqueCalls.length - 1;
          const isExpanded = expanded[call.id] ?? false;
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

          const Renderer = toolRenderers[call.name] || DefaultToolRenderer;

          return (
            <div key={call.id} className="flex gap-3">
              {/* Timeline column: dot + connector */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    state === "executing" && "bg-blue-500 animate-pulse",
                    state === "complete" && "bg-green-500",
                    state === "error" && "bg-red-500",
                  )}
                />
                {!isLast && <div className="w-px flex-1 bg-border/40 mt-1" />}
              </div>

              {/* Content column */}
              <div className="flex-1 pb-3 min-w-0">
                {/* Toggle trigger */}
                <button
                  onClick={() => toggleTool(call.id)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  <ToolIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                    {getToolLabel(
                      call.name,
                      state === "executing",
                      parsedResult,
                    )}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  />
                </button>

                {/* Expanded renderer content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <Renderer
                          call={call}
                          parsedArgs={parsedArgs}
                          parsedResult={parsedResult}
                          state={state}
                          ToolIcon={ToolIcon}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
