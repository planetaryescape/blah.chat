"use client";

import { Component, type ReactNode, memo, useRef } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import "katex/dist/contrib/mhchem.mjs"; // Chemistry notation support
import { useStreamBuffer } from "@/hooks/useStreamBuffer";
import { useMathCopyButtons } from "@/hooks/useMathCopyButtons";
import { useMathAccessibility } from "@/hooks/useMathAccessibility";
import { useLazyMathRenderer } from "@/hooks/useLazyMathRenderer";
import { CodeBlock } from "./CodeBlock";
import { MathBlock } from "./MathBlock";
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
const katexOptions = {
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
 * - Display: $$...$$
 * - Inline: \(...\)
 * - Chemistry: $$\ce{H2O}$$ (mhchem extension loaded above)
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
};

/**
 * Markdown content renderer with smooth character-by-character streaming
 *
 * Uses useStreamBuffer to decouple network timing from visual timing:
 * - Server sends chunky updates (200ms intervals)
 * - Buffer smoothly reveals characters at 200 chars/sec via RAF
 * - Prevents layout shifts and jarring appearance during streaming
 */
export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Buffer hook smoothly reveals characters from server chunks
  const { displayContent, hasBufferedContent } = useStreamBuffer(
    content,
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
