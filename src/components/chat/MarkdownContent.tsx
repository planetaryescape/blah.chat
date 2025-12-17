"use client";

import { useLazyMathRenderer } from "@/hooks/useLazyMathRenderer";
import { useMathAccessibility } from "@/hooks/useMathAccessibility";
import { useMathCopyButtons } from "@/hooks/useMathCopyButtons";
import { useStreamBuffer } from "@/hooks/useStreamBuffer";
import { cn } from "@/lib/utils";
import "katex/dist/contrib/mhchem.mjs"; // Chemistry notation support
import { Component, memo, type ReactNode, useRef } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";
import { MathErrorBoundary } from "./MathErrorBoundary";
import { MathSkeleton } from "./MathSkeleton";

interface CodeBlockErrorBoundaryProps {
  children: ReactNode;
  code: string;
  language?: string;
}

interface CodeBlockErrorBoundaryState {
  hasError: boolean;
}

/**
 * Specialized error boundary for code blocks
 * Shows a plain text fallback if syntax highlighting completely fails
 */
class CodeBlockErrorBoundary extends Component<
  CodeBlockErrorBoundaryProps,
  CodeBlockErrorBoundaryState
> {
  constructor(props: CodeBlockErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CodeBlockErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(
      "[CodeBlock] Render error caught by boundary:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      // Fallback: render as plain preformatted text
      return (
        <div className="relative group my-4">
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t border-b border-border">
            <span className="text-xs text-muted-foreground font-mono">
              {this.props.language || "code"}
            </span>
          </div>
          <pre className="rounded-b overflow-x-auto max-h-[600px] overflow-y-auto w-full p-4 bg-[#24292e] text-[#e1e4e8]">
            <code>{this.props.code}</code>
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * KaTeX configuration for rehype-katex plugin
 * Note: displayMode and throwOnError are omitted (handled by rehype-katex)
 * Chemistry notation (\ce, \pu) enabled via mhchem import above
 */
const _katexOptions = {
  errorColor: "hsl(var(--destructive))",
  output: "htmlAndMathml" as const, // Both visual HTML + accessible MathML
  strict: "ignore" as const, // Continue rendering on unsupported commands (resilient for streaming)
  // Common math shortcuts
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    "\\ZZ": "\\mathbb{Z}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\abs": "\\left|#1\\right|",
    "\\norm": "\\left\\|#1\\right\\|",
  },
};

/**
 * Standard components for Streamdown - no animation classes
 * Animation is handled by character-level reveal in useStreamBuffer
 *
 * Math support via Streamdown's built-in remark-math + rehype-katex:
 * - Inline: $$x = 5$$ (keep $$ on same line as text)
 * - Block/Display: $$ on separate lines
 * - Chemistry: $$\ce{H2O}$$ (mhchem extension loaded above)
 * NOTE: Single $ delimiters are NOT supported (to avoid currency conflicts)
 */
const markdownComponents = {
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    const inline = !match && !className;

    if (inline) {
      return <CodeBlock code={code} inline />;
    }

    const language = match?.[1];
    return (
      <CodeBlockErrorBoundary code={code} language={language}>
        <CodeBlock code={code} language={language} />
      </CodeBlockErrorBoundary>
    );
  },
  // Custom image component for proper sizing and error handling
  img: ({ src, alt, ...props }: any) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || "Image"}
        className="rounded-lg max-w-full h-auto my-4 block"
        style={{ maxHeight: "600px", backgroundColor: "#fff" }}
        loading="lazy"
        onError={(e) => {
          console.error("[Markdown] Image failed to load:", src);
          // Replace with error placeholder
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Crect fill='%23f0f0f0' width='200' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3EImage failed to load%3C/text%3E%3C/svg%3E";
        }}
        {...props}
      />
    );
  },
  a: ({ href, children, ...props }: any) => {
    // Handle citation links [1] -> #source-1
    if (href?.startsWith("#source-")) {
      return (
        <a
          href={href}
          className="citation-link"
          onClick={(e) => {
            e.preventDefault();
            const element = document.querySelector(href);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          {...props}
        >
          {children}
        </a>
      );
    }

    // Default external link
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

/**
 * Markdown content renderer with smooth character-by-character streaming
 *
 * Uses useStreamBuffer to decouple network timing from visual timing:
 * - Server sends chunky updates (200ms intervals)
 * - Buffer smoothly reveals characters at 200 chars/sec via RAF
 * - Prevents layout shifts and jarring appearance during streaming
 */

/**
 * Normalize LaTeX delimiters to Streamdown's expected format.
 * AI models often use \(...\) for inline and \[...\] for block math,
 * but Streamdown expects $$...$$ for both (inline on same line, block on separate lines).
 * Skips code blocks to avoid breaking LaTeX source display.
 */
function normalizeLatexDelimiters(text: string): string {
  // Fast path: skip if no LaTeX-style delimiters present
  if (!text.includes("\\(") && !text.includes("\\[")) return text;

  // Split by code blocks (fenced and inline) to avoid processing code
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`)/);

  return parts
    .map((part) => {
      // If it starts with ` it's code, return unchanged
      if (part.startsWith("`")) return part;

      // Convert \(...\) to inline $$...$$
      let result = part.replace(/\\\(([^)]*?)\\\)/g, "$$$$$1$$$$");

      // Convert \[...\] to block $$...$$ (with newlines for display mode)
      result = result.replace(/\\\[([^\]]*?)\\\]/g, "\n$$$$$1$$\n");

      return result;
    })
    .join("");
}

/**
 * Process text to linkify citations [n] -> [[n]](#source-n)
 * Skips code blocks to avoid breaking code.
 */
function processCitations(text: string): string {
  // fast path
  if (!text.includes("[")) return text;

  // Split by code blocks
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`)/);

  return parts
    .map((part) => {
      // If it starts with ` it's code, return distinct
      if (part.startsWith("`")) return part;

      // Replace [1], [2] etc with link
      return part.replace(/\[(\d+)\]/g, "[$1](#source-$1)");
    })
    .join("");
}

export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize LaTeX delimiters before other processing
  // AI models often output \(...\) but Streamdown expects $$...$$
  const normalizedContent = normalizeLatexDelimiters(content);

  // Process citations before buffering
  // This ensures the buffer sees the "final" linkified version
  // If a [1] appears, the processed content will change non-monotonically
  // prompting useStreamBuffer to reset buffer and show the new content immediately
  const processedContent = processCitations(normalizedContent);

  // Buffer hook smoothly reveals characters from server chunks
  const { displayContent, hasBufferedContent } = useStreamBuffer(
    processedContent,
    isStreaming,
    {
      charsPerSecond: 200,
      minTokenSize: 3,
      adaptiveThreshold: 5000,
    },
  );

  // Phase 4A: Lazy rendering for mobile performance
  const { observeRef, isRendered, isMobile } = useLazyMathRenderer({
    threshold: 0.01,
    rootMargin: "50px 0px",
    mobileOnly: true,
  });

  // Enhance math blocks with copy buttons (Phase 4D)
  useMathCopyButtons(containerRef);

  // Add ARIA accessibility to math elements (Phase 4C - enhanced)
  useMathAccessibility(containerRef, isStreaming);

  // Show cursor while streaming OR buffer is draining
  const showCursor = isStreaming || hasBufferedContent;

  // Detect if content has math (simple heuristic)
  const hasMath =
    displayContent.includes("$$") || displayContent.includes("\\(");

  // Show skeleton on mobile while waiting for intersection
  if (isMobile && hasMath && !isRendered) {
    return (
      <div ref={observeRef} className="markdown-content prose">
        <MathSkeleton isDisplay />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("markdown-content prose", showCursor && "streaming")}
    >
      <MathErrorBoundary>
        <Streamdown
          components={markdownComponents}
          parseIncompleteMarkdown={isStreaming}
        >
          {displayContent}
        </Streamdown>
      </MathErrorBoundary>
      {showCursor && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
}

/**
 * Memoized version of MarkdownContent to prevent unnecessary re-renders
 * Only re-renders when content or streaming state changes
 */
export const MarkdownContentMemo = memo(
  MarkdownContent,
  (prev, next) =>
    prev.content === next.content && prev.isStreaming === next.isStreaming,
);
