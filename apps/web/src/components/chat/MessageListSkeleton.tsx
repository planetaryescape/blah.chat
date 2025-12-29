"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";

interface MessageListSkeletonProps {
  chatWidth?: ChatWidth;
}

export function MessageListSkeleton({
  chatWidth = "standard",
}: MessageListSkeletonProps) {
  // Message bubble styling (matches ChatMessage.tsx exactly)
  const userMessageClass = cn(
    "relative rounded-[2rem] rounded-tr-sm",
    "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
    "bg-primary/5",
    "border border-primary/10",
  );

  const assistantMessageClass = cn(
    "relative rounded-[2rem] rounded-tl-sm",
    "px-5 py-3 sm:px-6 sm:py-4 text-sm sm:text-base leading-relaxed",
    "bg-muted/30 border border-border/30",
  );

  // Wrapper classes (matches ChatMessage.tsx structure exactly)
  const userWrapperClass = "relative group ml-auto max-w-[90%] sm:max-w-[75%]";
  const assistantWrapperClass =
    "relative group mr-auto max-w-[95%] sm:max-w-[85%]";

  // Simulated conversation with varying content lengths
  const skeletonMessages = [
    { isUser: true, lines: [{ width: "w-24" }, { width: "w-40" }] },
    {
      isUser: false,
      lines: [{ width: "w-48" }, { width: "w-72 sm:w-96" }, { width: "w-56" }],
    },
    { isUser: true, lines: [{ width: "w-32" }] },
    {
      isUser: false,
      lines: [{ width: "w-64" }, { width: "w-80 sm:w-[400px]" }],
    },
  ];

  return (
    <div className="flex-1 w-full min-w-0 relative flex flex-col overflow-hidden">
      <div
        className="flex-1 w-full min-w-0 overflow-y-auto relative"
        style={{
          contain: "layout style paint",
          contentVisibility: "auto",
        }}
      >
        {/* Grid structure matches VirtualizedMessageList exactly */}
        <div
          className={cn(
            "grid gap-4 p-4",
            chatWidth === "narrow" && "grid-cols-[1fr_min(42rem,100%)_1fr]",
            chatWidth === "standard" && "grid-cols-[1fr_min(56rem,100%)_1fr]",
            chatWidth === "wide" && "grid-cols-[1fr_min(72rem,100%)_1fr]",
            chatWidth === "full" && "grid-cols-[1fr_min(95%,100%)_1fr]",
            !chatWidth && "grid-cols-[1fr_min(56rem,100%)_1fr]",
          )}
        >
          {skeletonMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "col-start-2 flex w-full mb-10",
                msg.isUser ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={
                  msg.isUser ? userWrapperClass : assistantWrapperClass
                }
              >
                <div
                  className={
                    msg.isUser ? userMessageClass : assistantMessageClass
                  }
                >
                  <div className="space-y-2">
                    {msg.lines.map((line, j) => (
                      <Skeleton
                        key={j}
                        className={cn(
                          "h-4",
                          line.width,
                          msg.isUser && "ml-auto",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
