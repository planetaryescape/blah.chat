"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MathBlockProps {
  source: string; // Raw LaTeX source
  rendered: React.ReactNode; // Rendered KaTeX output
  displayMode?: boolean;
}

/**
 * Math block with copy-to-clipboard support
 * Provides dual clipboard: plain text gets LaTeX source, rich text gets rendered equation
 */
export function MathBlock({
  source,
  rendered,
  displayMode = true,
}: MathBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Wrap source with appropriate delimiters
      const latexSource = displayMode ? `$$${source}$$` : `\\(${source}\\)`;

      // For modern browsers with Clipboard API support
      if (navigator.clipboard && ClipboardItem) {
        // Try dual clipboard (plain text + HTML)
        const htmlContent = (
          e.currentTarget.parentElement as HTMLElement
        )?.querySelector(".katex-display, .katex-inline")?.innerHTML;

        if (htmlContent) {
          const htmlBlob = new Blob([htmlContent], { type: "text/html" });
          const textBlob = new Blob([latexSource], { type: "text/plain" });

          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": textBlob,
              "text/html": htmlBlob,
            }),
          ]);
        } else {
          // Fallback: just copy LaTeX source
          await navigator.clipboard.writeText(latexSource);
        }
      } else {
        // Fallback for older browsers
        await navigator.clipboard.writeText(latexSource);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy math:", error);
      // Try simple fallback
      await navigator.clipboard.writeText(
        displayMode ? `$$${source}$$` : `\\(${source}\\)`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!displayMode) {
    // Inline math - no copy button
    return <span className="katex-inline">{rendered}</span>;
  }

  return (
    <div className="group relative">
      <div className={cn("katex-display", "transition-all")}>{rendered}</div>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={handleCopy}
        aria-label="Copy LaTeX source"
        type="button"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
