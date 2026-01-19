"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getToolIcon, getToolLabel } from "./toolCallUtils";
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
