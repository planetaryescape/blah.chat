"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";
import { Skeleton } from "@/components/ui/skeleton";

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const targetContentRef = useRef(content);
  const rafRef = useRef<number | undefined>(undefined);

  // Batch updates with RAF to prevent excessive re-parsing
  useEffect(() => {
    // On refresh: show content instantly (no animation)
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    targetContentRef.current = content;

    // Cancel pending RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Batch update to next frame
    rafRef.current = requestAnimationFrame(() => {
      setDisplayedContent(content);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [content, isStreaming]);

  // Typewriter effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setDisplayedContent((prev) => {
        const target = targetContentRef.current;
        if (prev === target) return prev;

        // Reveal 50 chars at a time (increased from 10 for better performance)
        const nextLen = Math.min(prev.length + 50, target.length);
        return target.slice(0, nextLen);
      });
    }, 100); // 100ms (reduced from 30ms for fewer updates)

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="prose">
      <Streamdown
        children={displayedContent}
        components={{
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const inline = !match && !className;
            return !inline && match ? (
              <CodeBlock code={code} language={match[1]} />
            ) : (
              <CodeBlock code={code} inline />
            );
          },
        }}
      />
    </div>
  );
}
