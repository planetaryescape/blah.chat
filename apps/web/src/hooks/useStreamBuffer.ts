import { useEffect, useRef, useState } from "react";

export interface StreamBufferOptions {
  /**
   * Words per second for streaming.
   * @default 30
   */
  wordsPerSecond?: number;
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

  /**
   * Number of words recently released (for animation targeting).
   * Resets each animation frame.
   */
  newWordsCount: number;
}

/**
 * Buffers streaming content and reveals it smoothly word-by-word.
 *
 * Decouples network timing (chunky server updates) from visual timing
 * (smooth RAF-based word reveal). Prevents layout shifts and jarring
 * text appearance during streaming.
 *
 * @param serverContent - The full content from the server (grows over time)
 * @param isStreaming - Whether content is actively streaming
 * @param options - Configuration options
 *
 * @example
 * const { displayContent, hasBufferedContent, newWordsCount } = useStreamBuffer(
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
  const [newWordsCount, setNewWordsCount] = useState(0);

  // Configuration - 30 words/sec default for smooth reading
  const wordsPerSecond = options?.wordsPerSecond ?? 30;

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
        setNewWordsCount(0);
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
      setNewWordsCount(0);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      return;
    }

    // RAF loop: smoothly release words from buffer
    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;

      // Calculate words to release based on elapsed time
      const wordsToRelease = Math.floor((elapsed / 1000) * wordsPerSecond);

      if (wordsToRelease > 0 && bufferRef.current.length > 0) {
        // Extract words from buffer
        const nextChunk = extractWords(bufferRef.current, wordsToRelease);

        if (nextChunk.length > 0) {
          const wordCount = countWords(nextChunk);
          setDisplayContent((prev) => prev + nextChunk);
          setNewWordsCount(wordCount);
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
  }, [serverContent, isStreaming, wordsPerSecond, displayContent]);

  return {
    displayContent,
    hasBufferedContent,
    newWordsCount,
  };
}

/**
 * Extract N words from the start of text, preserving trailing whitespace.
 */
function extractWords(text: string, maxWords: number): string {
  if (!text || maxWords <= 0) return "";

  let wordCount = 0;
  let endIndex = 0;
  let inWord = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isWhitespace = /\s/.test(char);

    if (!isWhitespace && !inWord) {
      // Starting a new word
      inWord = true;
    } else if (isWhitespace && inWord) {
      // Ending a word
      inWord = false;
      wordCount++;
      endIndex = i + 1; // Include the whitespace

      if (wordCount >= maxWords) {
        break;
      }
    }
  }

  // Handle case where we're in the middle of a word at end of buffer
  if (inWord && wordCount < maxWords) {
    // Don't include partial word - wait for more content
    // Unless it's the entire buffer (small edge case)
    if (endIndex === 0 && text.length < 50) {
      return text;
    }
  }

  return text.slice(0, endIndex);
}

/**
 * Count words in text.
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
