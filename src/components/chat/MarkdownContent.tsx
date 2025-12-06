"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useMemo, Component, type ReactNode } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";

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
 * Creates animated wrapper components for Streamdown
 * Each text element gets word-by-word fade-in animation
 */
function createAnimatedComponents(isStreaming: boolean) {
  if (!isStreaming) {
    // Return standard components for non-streaming content
    return {
      code: ({ className, children }: { className?: string; children?: ReactNode }) => {
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
  }

  // Streaming components with fade-in animation via CSS
  return {
    code: ({ className, children }: { className?: string; children?: ReactNode }) => {
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children).replace(/\n$/, "");
      const inline = !match && !className;

      if (inline) {
        return (
          <span className="streaming-word" style={{ animationDelay: "0ms" }}>
            <CodeBlock code={code} inline />
          </span>
        );
      }

      const language = match?.[1];
      return (
        <div className="streaming-block">
          <CodeBlockErrorBoundary code={code} language={language}>
            <CodeBlock code={code} language={language} />
          </CodeBlockErrorBoundary>
        </div>
      );
    },
    // Wrap paragraph text content with animated words
    p: ({ children }: { children?: ReactNode }) => (
      <p className="streaming-paragraph">{children}</p>
    ),
    // Lists get block-level animation
    li: ({ children }: { children?: ReactNode }) => (
      <li className="streaming-list-item">{children}</li>
    ),
    // Headings
    h1: ({ children }: { children?: ReactNode }) => (
      <h1 className="streaming-heading">{children}</h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className="streaming-heading">{children}</h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="streaming-heading">{children}</h3>
    ),
  };
}

/**
 * Markdown content renderer with streaming fade-in animation
 *
 * Uses Streamdown for markdown parsing with CSS-based animations:
 * - During streaming: Applies fade-in CSS animation to content blocks
 * - After completion: Standard rendering without animation overhead
 */
export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const [animationKey, setAnimationKey] = useState(0);
  const prevContentLengthRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  // Batch updates with RAF to prevent excessive re-parsing
  useEffect(() => {
    // Update displayed content
    if (!isStreaming) {
      setDisplayedContent(content);
      prevContentLengthRef.current = content.length;
      return;
    }

    // Cancel pending RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Batch update to next frame
    rafRef.current = requestAnimationFrame(() => {
      // Check if content grew (new text arrived)
      if (content.length > prevContentLengthRef.current) {
        setAnimationKey((k) => k + 1); // Trigger re-animation
      }
      prevContentLengthRef.current = content.length;
      setDisplayedContent(content);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [content, isStreaming]);

  // Memoize components to prevent recreation on each render
  const components = useMemo(
    () => createAnimatedComponents(isStreaming),
    [isStreaming],
  );

  return (
    <div
      className={cn("prose", isStreaming && "is-streaming")}
      key={isStreaming ? `streaming-${animationKey}` : "static"}
    >
      <Streamdown children={displayedContent} components={components} />
    </div>
  );
}
