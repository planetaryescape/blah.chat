import { startTransition, useEffect, useRef, useState } from "react";
import { getNextCompleteToken } from "@/lib/utils/markdownTokens";

export interface StreamBufferOptions {
  /**
   * Characters per second for normal streaming.
   * @default 200
   */
  charsPerSecond?: number;

  /**
   * Minimum token size (prevents splitting mid-word).
   * @default 3
   */
  minTokenSize?: number;

  /**
   * Buffer size threshold (bytes) to trigger faster drain.
   * When buffer exceeds this, speed doubles.
   * @default 5000
   */
  adaptiveThreshold?: number;
}

export interface StreamBufferResult {
  /**
   * The content to display (smoothly revealed).
   */
  displayContent: string;

  /**
   * Whether there's still content buffered (not yet displayed).
   * Useful for showing cursor even after streaming stops.
   */
  hasBufferedContent: boolean;
}

/**
 * Buffers streaming content and reveals it smoothly character-by-character.
 *
 * Decouples network timing (chunky server updates) from visual timing
 * (smooth RAF-based character reveal). Prevents layout shifts and jarring
 * text appearance during streaming.
 *
 * @param serverContent - The full content from the server (grows over time)
 * @param isStreaming - Whether content is actively streaming
 * @param options - Configuration options
 *
 * @example
 * const { displayContent, hasBufferedContent } = useStreamBuffer(
 *   message.partialContent || message.content || "",
 *   message.status === "generating"
 * );
 */
export function useStreamBuffer(
  serverContent: string,
  isStreaming: boolean,
  options?: StreamBufferOptions,
): StreamBufferResult {
  const [displayContent, setDisplayContent] = useState("");

  // Configuration
  const baseSpeed = options?.charsPerSecond ?? 200;
  const minTokenSize = options?.minTokenSize ?? 3;
  const adaptiveThreshold = options?.adaptiveThreshold ?? 5000;

  // Internal state (refs to avoid triggering re-renders)
  const bufferRef = useRef("");
  const lastServerContentRef = useRef("");
  const rafIdRef = useRef<number | undefined>(undefined);
  const lastTickRef = useRef(Date.now());

  // Track whether buffer has content
  const hasBufferedContent = bufferRef.current.length > 0;

  useEffect(() => {
    // Detect new content from server
    if (serverContent !== lastServerContentRef.current) {
      if (
        serverContent.length > lastServerContentRef.current.length &&
        serverContent.startsWith(lastServerContentRef.current)
      ) {
        // Server sent new chunk - add to buffer
        const newChunk = serverContent.slice(
          lastServerContentRef.current.length,
        );
        bufferRef.current += newChunk;
      } else {
        // Content replaced or changed non-monotonically (e.g. edits, citation expansion)
        // Reset everything
        setDisplayContent(serverContent);
        bufferRef.current = "";
        lastTickRef.current = Date.now();
      }

      lastServerContentRef.current = serverContent;
    }

    // If not streaming, flush buffer immediately and stop RAF
    if (!isStreaming) {
      if (bufferRef.current.length > 0) {
        // Drain remaining buffer
        setDisplayContent(serverContent);
        bufferRef.current = "";
      } else if (displayContent !== serverContent) {
        // Ensure display syncs with server (edge case)
        setDisplayContent(serverContent);
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      return;
    }

    // RAF loop: smoothly release characters from buffer
    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;

      // Adaptive speed: faster drain when buffer is large
      const currentSpeed =
        bufferRef.current.length > adaptiveThreshold
          ? baseSpeed * 2
          : baseSpeed;

      const charsToRelease = Math.floor((elapsed / 1000) * currentSpeed);

      if (charsToRelease > 0 && bufferRef.current.length > 0) {
        // Get token-aware chunk (respects word boundaries and markdown)
        const nextChunk = getNextCompleteToken(
          bufferRef.current,
          charsToRelease,
          minTokenSize,
        );

        if (nextChunk.length > 0) {
          // Use startTransition only when buffer is large to avoid UI lag under heavy load
          if (bufferRef.current.length > adaptiveThreshold) {
            startTransition(() => {
              setDisplayContent((prev) => prev + nextChunk);
            });
          } else {
            setDisplayContent((prev) => prev + nextChunk);
          }
          bufferRef.current = bufferRef.current.slice(nextChunk.length);
          lastTickRef.current = now;
        }
      }

      // Continue RAF loop
      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Start RAF if not already running
    if (!rafIdRef.current) {
      lastTickRef.current = Date.now();
      rafIdRef.current = requestAnimationFrame(tick);
    }

    // Cleanup on unmount or when streaming stops
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
    };
  }, [
    serverContent,
    isStreaming,
    baseSpeed,
    minTokenSize,
    adaptiveThreshold,
    displayContent,
  ]);

  return {
    displayContent,
    hasBufferedContent,
  };
}
