"use client";

import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";
import { ClientCodeControls } from "./ClientCodeControls";
import { useEffect, useRef, useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  inline?: boolean;
}

export function CodeBlock({ code, language, inline }: CodeBlockProps) {
  const [highlightedHTML, setHighlightedHTML] = useState("");
  const codeRef = useRef(code);
  const languageRef = useRef(language);

  if (inline) {
    return (
      <code
        className={cn(
          "bg-muted/80 px-1.5 py-0.5 rounded",
          "text-sm font-mono text-accent",
          "border border-border/20",
          "hover:bg-muted transition-colors",
        )}
      >
        {code}
      </code>
    );
  }

  // Defer syntax highlighting to avoid blocking during streaming
  useEffect(() => {
    // Skip re-highlighting if code hasn't changed
    if (codeRef.current === code && languageRef.current === language && highlightedHTML) {
      return;
    }

    codeRef.current = code;
    languageRef.current = language;

    // Use requestIdleCallback to run during browser idle time
    const idleCallback = requestIdleCallback(() => {
      const html = highlightCode(code, language || "text");
      setHighlightedHTML(html);
    });

    return () => cancelIdleCallback(idleCallback);
  }, [code, language, highlightedHTML]);

  const html = highlightedHTML || code; // Fallback to plain code while highlighting

  // Shiki returns complete HTML with inline styles
  // Wrap in our UI with line numbers, controls, scrolling
  return (
    <div className="relative group my-4">
      {/* Header with language and controls */}
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "code"}
        </span>
        <div className="flex gap-2">
          <ClientCodeControls code={code} />
        </div>
      </div>

      {/* Shiki-generated code (safe HTML from highlighter) */}
      <div className="relative">
        <div
          className={cn(
            "rounded-b overflow-x-auto max-h-[600px] overflow-y-auto w-full",
            "[&>pre]:m-0 [&>pre]:p-4 [&>pre]:w-full [&>pre]:overflow-x-auto",
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
