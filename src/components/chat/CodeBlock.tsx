"use client";

import { highlightCode, type HighlightResult } from "@/lib/highlighter";
import { cn } from "@/lib/utils";
import { ClientCodeControls } from "./ClientCodeControls";
import { useEffect, useRef, useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  inline?: boolean;
}

/**
 * Escape HTML for safe initial rendering before highlighting completes
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Create a safe initial fallback HTML while highlighting is in progress
 */
function createInitialFallback(code: string): string {
  return `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8"><code>${escapeHtml(code)}</code></pre>`;
}

export function CodeBlock({ code, language, inline }: CodeBlockProps) {
  const [highlightResult, setHighlightResult] = useState<HighlightResult | null>(null);
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
    if (
      codeRef.current === code &&
      languageRef.current === language &&
      highlightResult
    ) {
      return;
    }

    codeRef.current = code;
    languageRef.current = language;

    const runHighlight = () => {
      // highlightCode now handles all errors internally and returns a safe result
      const result = highlightCode(code, language || "text");
      setHighlightResult(result);
    };

    // Use requestIdleCallback when available (Chrome, Firefox, Edge)
    // Fall back to setTimeout for Safari/iOS which doesn't support requestIdleCallback
    if ("requestIdleCallback" in window) {
      const idleCallback = requestIdleCallback(runHighlight);
      return () => cancelIdleCallback(idleCallback);
    } else {
      const timeout = setTimeout(runHighlight, 1);
      return () => clearTimeout(timeout);
    }
  }, [code, language, highlightResult]);

  // Use highlighted HTML or safe escaped fallback while loading
  const html = highlightResult?.html || createInitialFallback(code);

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
