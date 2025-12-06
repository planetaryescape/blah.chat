"use client";

import { motion } from "framer-motion";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  Component,
  type ReactNode,
  memo,
} from "react";
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
 * Animated word component for streaming fade-in effect
 */
const AnimatedWord = memo(function AnimatedWord({
  word,
  index,
  isNew,
}: {
  word: string;
  index: number;
  isNew: boolean;
}) {
  if (!isNew) {
    return <>{word}</>;
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.1, 0.25, 1],
        delay: Math.min(index * 0.02, 0.3), // Stagger up to 300ms
      }}
      style={{ display: "inline" }}
    >
      {word}
    </motion.span>
  );
});

/**
 * Streaming text with word-by-word fade-in animation
 * Used for streaming responses - creates a smooth, ChatGPT-like effect
 */
const StreamingMarkdown = memo(function StreamingMarkdown({
  content,
}: {
  content: string;
}) {
  // Track which word index we've "committed" as visible
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const prevContentLengthRef = useRef(0);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Split content into words while preserving whitespace
  const parts = useMemo(() => content.split(/(\s+)/), [content]);

  // Count only non-whitespace parts (actual words)
  const wordCount = useMemo(
    () => parts.filter((p) => p.trim()).length,
    [parts],
  );

  // When new content arrives, animate new words in
  useEffect(() => {
    const contentGrew = content.length > prevContentLengthRef.current;
    prevContentLengthRef.current = content.length;

    if (contentGrew && wordCount > visibleWordCount) {
      // Clear any pending animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // Reveal words progressively
      const wordsToReveal = wordCount - visibleWordCount;
      const revealDelay = Math.min(50, 300 / Math.max(wordsToReveal, 1));

      let revealed = 0;
      const revealNext = () => {
        revealed++;
        setVisibleWordCount((prev) => Math.min(prev + 1, wordCount));

        if (revealed < wordsToReveal) {
          animationTimeoutRef.current = setTimeout(revealNext, revealDelay);
        }
      };

      revealNext();
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [content, wordCount, visibleWordCount]);

  // Build the animated content
  let wordIndex = 0;
  const animatedParts = parts.map((part, partIndex) => {
    // Whitespace - render as-is
    if (!part.trim()) {
      return <span key={`ws-${partIndex}`}>{part}</span>;
    }

    const currentWordIndex = wordIndex++;
    const isVisible = currentWordIndex < visibleWordCount;
    const isNew = currentWordIndex >= visibleWordCount - 15; // Last 15 words animate

    if (!isVisible) {
      return null;
    }

    return (
      <AnimatedWord
        key={`word-${currentWordIndex}-${part.slice(0, 10)}`}
        word={part}
        index={currentWordIndex - (visibleWordCount - 15)}
        isNew={isNew}
      />
    );
  });

  return (
    <div className="prose streaming-text">
      <div className="whitespace-pre-wrap">{animatedParts}</div>
    </div>
  );
});

/**
 * Static markdown renderer using Streamdown
 * Used for completed messages
 */
const StaticMarkdown = memo(function StaticMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <div className="prose">
      <Streamdown
        children={content}
        components={{
          code: ({ className, children }) => {
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
        }}
      />
    </div>
  );
});

/**
 * Markdown content renderer with streaming fade-in animation
 *
 * During streaming: Uses word-by-word fade-in animation (ChatGPT-style)
 * After completion: Uses Streamdown for optimized markdown rendering
 */
export function MarkdownContent({
  content,
  isStreaming = false,
}: MarkdownContentProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const [wasStreaming, setWasStreaming] = useState(isStreaming);
  const rafRef = useRef<number | undefined>(undefined);

  // Batch updates with RAF to prevent excessive re-parsing
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      // Small delay before switching to static renderer for smooth transition
      if (wasStreaming) {
        const timeout = setTimeout(() => setWasStreaming(false), 500);
        return () => clearTimeout(timeout);
      }
      return;
    }

    setWasStreaming(true);

    // Cancel pending RAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Batch update to next frame
    rafRef.current = requestAnimationFrame(() => {
      setDisplayedContent(content);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [content, isStreaming, wasStreaming]);

  // Use streaming renderer during streaming, static after completion
  if (isStreaming || wasStreaming) {
    return <StreamingMarkdown content={displayedContent} />;
  }

  return <StaticMarkdown content={displayedContent} />;
}
