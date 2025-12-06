"use client";

import { cn } from "@/lib/utils";
import { Component, type ReactNode } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "./CodeBlock";
import { useStreamBuffer } from "@/hooks/useStreamBuffer";

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
 * Standard components for Streamdown - no animation classes
 * Animation is handled by character-level reveal in useStreamBuffer
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

  // Show cursor while streaming OR buffer is draining
  const showCursor = isStreaming || hasBufferedContent;

  return (
    <div className={cn("markdown-content prose", showCursor && "streaming")}>
      <Streamdown children={displayContent} components={markdownComponents} />
      {showCursor && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
}
