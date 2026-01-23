"use client";

import { useLazyMathRenderer } from "@/hooks/useLazyMathRenderer";
import { useMathAccessibility } from "@/hooks/useMathAccessibility";
import { useMathCopyButtons } from "@/hooks/useMathCopyButtons";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStreamBuffer } from "@/hooks/useStreamBuffer";
import { useWorkerMarkdown } from "@/hooks/useWorkerMarkdown";
import { findAllVerses, parseVerseReference } from "@/lib/bible/parser";
import { cn } from "@/lib/utils";
import "katex/dist/contrib/mhchem.mjs"; // Chemistry notation support
import { Component, memo, type ReactNode, useMemo, useRef } from "react";
import { Streamdown } from "streamdown";
import { BibleVerseLink } from "./BibleVerseLink";
import { CodeBlock } from "./CodeBlock";
import { MathErrorBoundary } from "./MathErrorBoundary";
import { MathSkeleton } from "./MathSkeleton";
import { MermaidRenderer } from "./MermaidRenderer";

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
 * Standard components for Streamdown
 *
 * Math support via Streamdown's built-in remark-math + rehype-katex:
 * - Inline: $$x = 5$$ (keep $$ on same line as text)
 * - Block/Display: $$ on separate lines
 * - Chemistry: $$\ce{H2O}$$ (mhchem extension loaded above)
 * NOTE: Single $ delimiters are NOT supported (to avoid currency conflicts)
 *
 * Code handling:
 * - Mermaid diagrams: Use custom MermaidRenderer with fullscreen/download/copy controls (theme-aware)
 * - All other code: Use custom CodeBlock with copy/wrap buttons and syntax highlighting
 *
 * Note: This is now created inside MarkdownContent component to access theme
 */
const createMarkdownComponents = () => ({
  // Custom code component - routes mermaid to MermaidRenderer, everything else to CodeBlock
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match?.[1];
    const code = String(children).replace(/\n$/, "");

    // Route mermaid diagrams to MermaidRenderer
    // Theme colors are now handled inside MermaidRenderer via useTheme
    if (language === "mermaid") {
      return (
        <MermaidRenderer
          code={code}
          config={{
            flowchart: { nodeSpacing: 50, rankSpacing: 50, curve: "basis" },
            sequence: {
              actorMargin: 50,
              boxMargin: 10,
              boxTextMargin: 5,
              diagramMarginX: 50,
              diagramMarginY: 10,
              messageMargin: 35,
            },
            state: { titleTopMargin: 25 },
          }}
        />
      );
    }
    const inline = !match && !className;
    if (inline) {
      return <CodeBlock code={code} inline />;
    }

    // All other code blocks use CodeBlock component
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
        className="rounded-lg max-w-full my-4 block"
        style={{
          maxHeight: "600px",
          minHeight: "100px", // Reserve space to prevent layout shift
          backgroundColor: "#f5f5f5",
          objectFit: "contain",
        }}
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

    // Handle Bible verse links (bible://John.3.16)
    if (href?.startsWith("bible://")) {
      const osis = href.replace("bible://", "");
      return <BibleVerseLink osis={osis}>{children}</BibleVerseLink>;
    }

    // Default external link
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
});

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

/**
 * Process text to detect and linkify Bible verse references
 * Supports both explicit syntax [[John 3:16]] and auto-detection
 * Skips code blocks to avoid breaking code.
 */
function processBibleVerses(text: string): string {
  // Split by code blocks and existing markdown links to avoid processing them
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/);

  return parts
    .map((part) => {
      // If it starts with ` it's code, or it's a markdown link, return unchanged
      if (part.startsWith("`") || part.startsWith("[")) return part;

      // Phase A: Explicit [[John 3:16]] → [John 3:16](bible://John.3.16)
      let result = part.replace(/\[\[([^\]]+)\]\]/g, (_, ref) => {
        const parsed = parseVerseReference(ref);
        return parsed
          ? `[${parsed.display}](bible://${parsed.osis})`
          : `[[${ref}]]`;
      });

      // Phase B: Auto-detect "John 3:16" style references
      const verses = findAllVerses(result);
      if (verses.length > 0) {
        // Replace in reverse order to preserve indices
        for (const v of [...verses].reverse()) {
          // Skip if already inside a markdown link
          const before = result.slice(0, v.start);
          if (before.match(/\[[^\]]*$/)) continue;

          result =
            result.slice(0, v.start) +
            `[${v.display}](bible://${v.osis})` +
            result.slice(v.end);
        }
      }

      return result;
    })
    .join("");
}

export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Create markdown components (including theme-aware Mermaid)
  const markdownComponents = createMarkdownComponents();

  // MEMOIZED: Expensive O(n) regex processing - only recompute when content changes
  // This prevents redundant processing during RAF-based streaming (~60 renders/sec)
  const processedContent = useMemo(() => {
    // Normalize LaTeX delimiters before other processing
    // AI models often output \(...\) but Streamdown expects $$...$$
    const normalizedContent = normalizeLatexDelimiters(content);

    // Process citations and Bible verses before buffering
    // This ensures the buffer sees the "final" linkified version
    // If a [1] appears, the processed content will change non-monotonically
    // prompting useStreamBuffer to reset buffer and show the new content immediately
    const withCitations = processCitations(normalizedContent);
    return processBibleVerses(withCitations);
  }, [content]);

  // Buffer hook smoothly reveals words from server chunks
  // Bypass buffering if user prefers reduced motion (instant text display)
  const { displayContent, hasBufferedContent } = useStreamBuffer(
    processedContent,
    isStreaming && !prefersReducedMotion,
    {
      wordsPerSecond: 30, // Smooth word-by-word reveal
    },
  );

  // Web worker for large completed messages (≥5KB)
  // Offloads expensive markdown parsing to worker thread to keep UI at 60fps
  // Returns null during streaming or for small content (not worth overhead)
  const { html: workerHtml } = useWorkerMarkdown(content, isStreaming);

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

  // Use worker-rendered HTML for large completed messages
  // XSS-SAFE: HTML sanitized by DOMPurify in worker (see worker.ts parseMarkdown)
  if (workerHtml && !isStreaming) {
    return (
      <div
        ref={containerRef}
        className="markdown-content prose"
        dangerouslySetInnerHTML={{ __html: workerHtml }}
      />
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
          controls={{
            code: false, // We handle code controls via custom CodeBlock component
            mermaid: false, // We handle mermaid controls via custom MermaidRenderer
          }}
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
