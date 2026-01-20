"use client";

import { useMemo } from "react";
import { MarkdownContent } from "./MarkdownContent";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  timestamp: number;
  textPosition?: number;
}

interface InlineToolCallContentProps {
  content: string;
  toolCalls?: ToolCall[];
  partialToolCalls?: ToolCall[];
  isStreaming?: boolean;
}

/**
 * Small loading indicator shown after tool calls complete but before text resumes.
 */
function StreamingIndicator() {
  return (
    <div className="flex gap-1 items-center h-4 mt-2">
      <span
        className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

interface ContentSegment {
  type: "text" | "tool";
  content?: string;
  toolCalls?: ToolCall[];
}

/**
 * Renders message content with tool calls inline at their actual positions.
 * Splits content at textPosition markers and interleaves tool call displays.
 */
export function InlineToolCallContent({
  content,
  toolCalls,
  partialToolCalls,
  isStreaming = false,
}: InlineToolCallContentProps) {
  // Merge and dedupe tool calls
  const allToolCalls = useMemo(() => {
    const combined = [...(toolCalls || [])];
    if (partialToolCalls) {
      for (const partial of partialToolCalls) {
        if (!combined.some((c) => c.id === partial.id)) {
          combined.push(partial);
        }
      }
    }
    return combined;
  }, [toolCalls, partialToolCalls]);

  // Sort tool calls by position (separate memo to avoid re-sorting when only content changes)
  const sortedCalls = useMemo(() => {
    return [...allToolCalls].sort((a, b) => {
      const posA = a.textPosition ?? Infinity;
      const posB = b.textPosition ?? Infinity;
      if (posA !== posB) return posA - posB;
      return a.timestamp - b.timestamp;
    });
  }, [allToolCalls]);

  // Build segments: interleave text and tool calls based on textPosition
  const segments = useMemo<ContentSegment[]>(() => {
    if (sortedCalls.length === 0) {
      // No tool calls, just render content
      return content ? [{ type: "text", content }] : [];
    }

    // Check if any tool calls have position info
    const hasPositionInfo = sortedCalls.some(
      (tc) => tc.textPosition !== undefined && tc.textPosition !== null,
    );

    if (!hasPositionInfo) {
      // No position info - fall back to showing tool calls at top (legacy behavior)
      return [
        { type: "tool", toolCalls: sortedCalls },
        ...(content ? [{ type: "text" as const, content }] : []),
      ];
    }

    // Build segments by splitting content at tool call positions
    const result: ContentSegment[] = [];
    let lastPosition = 0;

    // Group consecutive tool calls at the same position
    const positionGroups = new Map<number, ToolCall[]>();
    for (const tc of sortedCalls) {
      const pos = tc.textPosition ?? content.length;
      const existing = positionGroups.get(pos) || [];
      existing.push(tc);
      positionGroups.set(pos, existing);
    }

    // Sort positions and create segments
    const positions = Array.from(positionGroups.keys()).sort((a, b) => a - b);

    for (const pos of positions) {
      // Add text before this position
      if (pos > lastPosition) {
        const textSegment = content.slice(lastPosition, pos);
        if (textSegment.trim()) {
          result.push({ type: "text", content: textSegment });
        }
      }

      // Add tool calls at this position
      const callsAtPosition = positionGroups.get(pos)!;
      result.push({ type: "tool", toolCalls: callsAtPosition });

      lastPosition = pos;
    }

    // Add remaining text after last tool call
    if (lastPosition < content.length) {
      const remainingText = content.slice(lastPosition);
      if (remainingText.trim()) {
        result.push({ type: "text", content: remainingText });
      }
    }

    return result;
  }, [content, sortedCalls]);

  // Handle empty state
  if (segments.length === 0) {
    // Still streaming but no segments yet - show loading
    if (isStreaming) {
      return <StreamingIndicator />;
    }
    return null;
  }

  // Check if we should show loading indicator after tool calls
  // Show when: streaming, have tool calls, all tools completed, and last segment is a tool (no text after)
  const lastSegment = segments[segments.length - 1];
  const allToolsComplete =
    allToolCalls.length > 0 &&
    allToolCalls.every((tc) => tc.result !== undefined);
  const showPostToolLoading =
    isStreaming && allToolsComplete && lastSegment?.type === "tool";

  return (
    <div className="inline-tool-content space-y-2">
      {segments.map((segment, index) => {
        if (segment.type === "text" && segment.content) {
          return (
            <MarkdownContent
              key={`text-${index}`}
              content={segment.content}
              isStreaming={isStreaming && index === segments.length - 1}
            />
          );
        }

        if (segment.type === "tool" && segment.toolCalls) {
          return (
            <ToolCallDisplay
              key={`tool-${index}`}
              toolCalls={segment.toolCalls}
              partialToolCalls={[]}
            />
          );
        }

        return null;
      })}
      {/* Show loading indicator when tools are done but text hasn't started */}
      {showPostToolLoading && <StreamingIndicator />}
    </div>
  );
}
