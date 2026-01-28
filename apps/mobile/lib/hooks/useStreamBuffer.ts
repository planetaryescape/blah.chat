import { useEffect, useRef, useState } from "react";

export interface StreamBufferOptions {
  wordsPerSecond?: number;
}

export type BufferState = "filling" | "draining" | "empty" | "complete";

export interface StreamBufferResult {
  displayContent: string;
  hasBufferedContent: boolean;
  newWordsCount: number;
  bufferState: BufferState;
}

/**
 * Buffers streaming content and reveals it smoothly word-by-word.
 * Port of web useStreamBuffer hook for React Native.
 */
export function useStreamBuffer(
  serverContent: string,
  isStreaming: boolean,
  options?: StreamBufferOptions,
): StreamBufferResult {
  const [displayContent, setDisplayContent] = useState("");
  const [newWordsCount, setNewWordsCount] = useState(0);

  const wordsPerSecond = options?.wordsPerSecond ?? 30;

  const bufferRef = useRef("");
  const lastServerContentRef = useRef("");
  const rafIdRef = useRef<number | undefined>(undefined);
  const lastTickRef = useRef(Date.now());

  const hasBufferedContent = bufferRef.current.length > 0;

  useEffect(() => {
    if (serverContent !== lastServerContentRef.current) {
      if (
        serverContent.length > lastServerContentRef.current.length &&
        serverContent.startsWith(lastServerContentRef.current)
      ) {
        const newChunk = serverContent.slice(
          lastServerContentRef.current.length,
        );
        bufferRef.current += newChunk;
      } else {
        setDisplayContent(serverContent);
        bufferRef.current = "";
        setNewWordsCount(0);
        lastTickRef.current = Date.now();
      }

      lastServerContentRef.current = serverContent;
    }

    if (!isStreaming) {
      if (bufferRef.current.length > 0) {
        setDisplayContent(serverContent);
        bufferRef.current = "";
      } else if (displayContent !== serverContent) {
        setDisplayContent(serverContent);
      }
      setNewWordsCount(0);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      const wordsToRelease = Math.floor((elapsed / 1000) * wordsPerSecond);

      if (wordsToRelease > 0 && bufferRef.current.length > 0) {
        const nextChunk = extractWords(bufferRef.current, wordsToRelease);

        if (nextChunk.length > 0) {
          const wordCount = countWords(nextChunk);
          setDisplayContent((prev) => prev + nextChunk);
          setNewWordsCount(wordCount);
          bufferRef.current = bufferRef.current.slice(nextChunk.length);
          lastTickRef.current = now;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    if (!rafIdRef.current) {
      lastTickRef.current = Date.now();
      rafIdRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
    };
  }, [serverContent, isStreaming, wordsPerSecond, displayContent]);

  const bufferState: BufferState = (() => {
    if (!isStreaming && !hasBufferedContent) return "complete";
    if (!isStreaming && hasBufferedContent) return "draining";
    if (isStreaming && hasBufferedContent) return "filling";
    return "empty";
  })();

  return {
    displayContent,
    hasBufferedContent,
    newWordsCount,
    bufferState,
  };
}

function extractWords(text: string, maxWords: number): string {
  if (!text || maxWords <= 0) return "";

  let wordCount = 0;
  let endIndex = 0;
  let inWord = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isWhitespace = /\s/.test(char);

    if (!isWhitespace && !inWord) {
      inWord = true;
    } else if (isWhitespace && inWord) {
      inWord = false;
      wordCount++;
      endIndex = i + 1;

      if (wordCount >= maxWords) {
        break;
      }
    }
  }

  if (inWord && wordCount < maxWords) {
    if (endIndex === 0 && text.length < 50) {
      return text;
    }
    if (endIndex === 0 && text.length >= 100) {
      return text.slice(0, 100);
    }
  }

  return text.slice(0, endIndex);
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
