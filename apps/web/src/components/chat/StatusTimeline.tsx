"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getToolDescription, getToolIcon, getToolLabel } from "./toolCallUtils";
import { getCallState, type ToolCall } from "./toolRenderers";

interface StatusTimelineProps {
  toolCalls?: ToolCall[];
  partialToolCalls?: (Omit<ToolCall, "result"> & { result?: string })[];
  isGenerating: boolean;
  hasContent?: boolean;
}

interface TimelineItem {
  id: string;
  type: "tool" | "generating";
  name?: string;
  label: string;
  description?: string | null;
  state: "pending" | "executing" | "complete" | "error";
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Status timeline shown at the top of AI messages during generation.
 * Displays tool execution progress with a vertical timeline.
 * Handles its own visibility with graceful exit animation.
 */
export function StatusTimeline({
  toolCalls,
  partialToolCalls,
  isGenerating,
  hasContent = false,
}: StatusTimelineProps) {
  // Track visibility internally to allow graceful exit animation
  const [isVisible, setIsVisible] = useState(false);

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

  const hasToolCalls = uniqueCalls.length > 0;

  // Show timeline when generating with tool calls, hide after generation completes
  useEffect(() => {
    if (isGenerating && hasToolCalls) {
      setIsVisible(true);
    } else if (!isGenerating && isVisible) {
      // Delay hide to allow completion state to show briefly
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, hasToolCalls, isVisible]);

  // Build timeline items
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // Add tool call items
    for (const call of uniqueCalls) {
      const state = getCallState(call);
      let parsedArgs: any;
      let parsedResult: any;
      try {
        parsedArgs = JSON.parse(call.arguments);
        parsedResult = call.result ? JSON.parse(call.result) : null;
      } catch {
        parsedArgs = call.arguments;
        parsedResult = call.result;
      }

      items.push({
        id: call.id,
        type: "tool",
        name: call.name,
        label: getToolLabel(call.name, state === "executing", parsedResult),
        description: getToolDescription(call.name, parsedArgs),
        state,
        icon: getToolIcon(call.name),
      });
    }

    // Add final step: "Generating response..." while generating, "Complete" when done
    const allToolsComplete =
      uniqueCalls.length > 0 &&
      uniqueCalls.every((tc) => tc.result !== undefined);
    if (allToolsComplete) {
      if (isGenerating) {
        items.push({
          id: "generating-response",
          type: "generating",
          label: hasContent ? "Generating response..." : "Thinking...",
          state: "executing",
          icon: Sparkles,
        });
      } else {
        // Show completion state briefly before fade out
        items.push({
          id: "complete",
          type: "generating",
          label: "Complete",
          state: "complete",
          icon: Check,
        });
      }
    }

    return items;
  }, [uniqueCalls, isGenerating, hasContent]);

  return (
    <AnimatePresence>
      {isVisible && timelineItems.length > 0 && (
        <motion.div
          key="status-timeline"
          role="log"
          aria-live="polite"
          aria-busy={isGenerating ? "true" : "false"}
          aria-label="Tool execution progress"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-3 overflow-hidden"
        >
          <div className="space-y-0">
            {timelineItems.map((item, index) => {
              const isLast = index === timelineItems.length - 1;
              const ToolIcon = item.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.05 }}
                  className="flex gap-3"
                >
                  {/* Timeline column: dot + connector */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 transition-colors",
                        item.state === "pending" && "bg-muted-foreground/40",
                        item.state === "executing" &&
                          "bg-blue-500 animate-pulse",
                        item.state === "complete" && "bg-green-500",
                        item.state === "error" && "bg-red-500",
                      )}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-border/40 mt-1" />
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 pb-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <ToolIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span
                        className={cn(
                          "text-xs transition-colors truncate",
                          item.state === "executing"
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {/* Show description (query/URL) when executing */}
                    {item.description && item.state === "executing" && (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5 ml-5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
