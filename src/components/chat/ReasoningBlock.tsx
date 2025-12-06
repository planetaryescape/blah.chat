"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningBlockProps {
  reasoning?: string;
  partialReasoning?: string;
  thinkingStartedAt?: number;
  thinkingCompletedAt?: number;
  reasoningTokens?: number;
  isThinking?: boolean;
}

export function ReasoningBlock({
  reasoning,
  partialReasoning,
  thinkingStartedAt,
  thinkingCompletedAt,
  reasoningTokens,
  isThinking = false,
}: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayReasoning = reasoning || partialReasoning;
  const hasReasoningMetadata = thinkingCompletedAt && thinkingStartedAt;

  if (!displayReasoning && !hasReasoningMetadata && !isThinking) return null;

  const thinkingDuration =
    thinkingCompletedAt && thinkingStartedAt
      ? ((thinkingCompletedAt - thinkingStartedAt) / 1000).toFixed(1)
      : null;

  return (
    <div className="mb-4">
      {/* Collapsed trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5",
          "bg-muted/20 hover:bg-muted/30",
          "backdrop-blur-xl rounded-xl",
          "transition-colors duration-200",
          "text-sm text-muted-foreground",
          isThinking && "animate-pulse",
        )}
      >
        {isThinking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            <span>
              Thought for {thinkingDuration}s
              {reasoningTokens && ` (${reasoningTokens} tokens)`}
            </span>
          </>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 ml-auto transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {/* Expanded reasoning */}
      <AnimatePresence>
        {isExpanded && displayReasoning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-2 p-4 rounded-xl",
                "bg-muted/10 backdrop-blur-xl",
                "border border-border/50",
                "max-h-[400px] overflow-y-auto",
                "font-mono text-sm text-foreground/80",
                "whitespace-pre-wrap break-words",
              )}
            >
              {displayReasoning ? (
                <>
                  {displayReasoning}
                  {isThinking && (
                    <span className="inline-block w-2 h-4 ml-1 bg-primary/50 animate-pulse" />
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Full reasoning hidden by provider. Model used{" "}
                  {reasoningTokens || 0} reasoning tokens.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
