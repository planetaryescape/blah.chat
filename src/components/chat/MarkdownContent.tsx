"use client";

import { useState, useEffect, useRef, Component, type ReactNode } from "react";
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
    console.warn("[CodeBlock] Render error caught by boundary:", error, errorInfo);
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

            // Inline code doesn't need error boundary (simple rendering)
            if (inline) {
              return <CodeBlock code={code} inline />;
            }

            // Wrap code blocks in error boundary for graceful degradation
            const language = match?.[1];
            return (
              <CodeBlockErrorBoundary code={code} language={language}>
                <CodeBlock code={code} language={language} />
              </CodeBlockErrorBoundary>
            );
          },
        }}
      />
    </div>
  );
}
