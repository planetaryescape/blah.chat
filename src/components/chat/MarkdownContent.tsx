"use client";

import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";

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

  useEffect(() => {
    // On refresh: show content instantly (no animation)
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    targetContentRef.current = content;

    const interval = setInterval(() => {
      setDisplayedContent((prev) => {
        const target = targetContentRef.current;
        if (prev === target) return prev;

        // Reveal 10 chars at a time (typewriter effect)
        const nextLen = Math.min(prev.length + 10, target.length);
        return target.slice(0, nextLen);
      });
    }, 30); // ~33fps

    return () => clearInterval(interval);
  }, [content, isStreaming]);

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
