"use client";

import { markdownToSpeechText } from "@/lib/utils/markdownToSpeech";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

interface TTSState {
  isVisible: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  speed: number;
  sourceMessageId?: string;
  previewText?: string;
  // Streaming state
  totalChunks: number;
  currentChunk: number;
  isStreaming: boolean;
}

interface TTSContextValue {
  state: TTSState;
  playFromText: (options: { text: string; messageId?: string }) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (time: number) => void;
  setSpeed: (speed: number) => void;
  close: () => void;
}

const TTSContext = createContext<TTSContextValue | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Low latency: chunk at individual sentences (~150-200 chars)
const CHUNK_LIMIT = 200;

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = maxChars;
    const searchArea = remaining.slice(0, maxChars);

    // Look for sentence endings
    const lastPeriod = Math.max(
      searchArea.lastIndexOf(". "),
      searchArea.lastIndexOf("! "),
      searchArea.lastIndexOf("? "),
      searchArea.lastIndexOf(".\n"),
      searchArea.lastIndexOf("!\n"),
      searchArea.lastIndexOf("?\n"),
    );

    if (lastPeriod > maxChars * 0.3) {
       // Found a reasonable sentence boundary
      splitIndex = lastPeriod + 1;
    } else {
      // Fall back to comma or space
      const lastComma = searchArea.lastIndexOf(", ");
      if (lastComma > maxChars * 0.3) {
        splitIndex = lastComma + 1;
      } else {
        const lastSpace = searchArea.lastIndexOf(" ");
        if (lastSpace > maxChars * 0.3) {
          splitIndex = lastSpace;
        }
      }
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

function getTTSUrl(text: string, voice?: string, speed?: number) {
  let convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  let baseUrl = ""; // Start with relative

  if (convexUrl) {
    if (convexUrl.includes(".convex.cloud")) {
      baseUrl = convexUrl.replace(".convex.cloud", ".convex.site");
    } else {
        baseUrl = convexUrl;
    }
  }

  // Use string concatenation to avoid build-time template literal parsing issues
  const finalUrl = baseUrl ? baseUrl + "/tts" : "/tts";

  // URL constructor requires base if path is relative.
  // Use window.location.origin if available, otherwise localhost/dummy for build safety.
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(finalUrl, base);

  url.searchParams.set("text", text);
  if (voice) url.searchParams.set("voice", voice);
  if (speed) url.searchParams.set("speed", speed.toString());

  return url.toString();
}

export function TTSProvider({
  children,
  defaultSpeed = 1,
}: {
  children: ReactNode;
  defaultSpeed?: number;
}) {
  // MSE Refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const bufferQueueRef = useRef<ArrayBuffer[]>([]);
  const isAppendingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  const speedRef = useRef(clamp(defaultSpeed ?? 1, 0.5, 2));
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<TTSState>({
    isVisible: false,
    isLoading: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    speed: clamp(defaultSpeed ?? 1, 0.5, 2),
    sourceMessageId: undefined,
    previewText: "",
    totalChunks: 0,
    currentChunk: 0,
    isStreaming: false,
  });

  useEffect(() => {
    const clamped = clamp(defaultSpeed ?? 1, 0.5, 2);
    speedRef.current = clamped;
    setState((prev) => ({ ...prev, speed: clamped }));
  }, [defaultSpeed]);

  const cleanupAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.removeAttribute("src");
      currentAudioRef.current.load();
    }

    // Revoke Object URL
    if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
    }

    // MSE Cleanup
    if (mediaSourceRef.current) {
        try {
            if (mediaSourceRef.current.readyState === "open") {
                mediaSourceRef.current.endOfStream();
            }
        } catch (e) {
            // ignore
        }
        mediaSourceRef.current = null;
    }
    sourceBufferRef.current = null;
    bufferQueueRef.current = [];
    isAppendingRef.current = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cleanupAudio();
    setState((prev) => ({
      ...prev,
      isVisible: false,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      sourceMessageId: undefined,
      previewText: "",
      totalChunks: 0,
      currentChunk: 0,
      isStreaming: false,
    }));
  }, [cleanupAudio]);

  // Process the buffer queue safely
  const processBufferQueue = useCallback(() => {
    if (
        !sourceBufferRef.current ||
        sourceBufferRef.current.updating ||
        bufferQueueRef.current.length === 0
    ) {
        return;
    }

    const buffer = bufferQueueRef.current.shift();
    if (buffer) {
        try {
            sourceBufferRef.current.appendBuffer(buffer);
        } catch (e) {
            console.error("MSE appendBuffer failed", e);
        }
    }
  }, []);

  const playFromText = useCallback(
    async ({ text, messageId }: { text: string; messageId?: string }) => {
      const speechText = markdownToSpeechText(text);
      if (!speechText) {
        toast.error("This message is empty after removing formatting.");
        return;
      }

      cleanupAudio();
      abortControllerRef.current = new AbortController();

      const chunks = chunkText(speechText, CHUNK_LIMIT);
      const totalChunks = chunks.length;

      setState((prev) => ({
        ...prev,
        isVisible: true,
        isLoading: true,
        isPlaying: false,
        sourceMessageId: messageId,
        previewText: speechText.slice(0, 220),
        currentTime: 0,
        duration: 0,
        totalChunks,
        currentChunk: 0,
        isStreaming: totalChunks > 1,
      }));

      // Setup MSE
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      const objectUrl = URL.createObjectURL(mediaSource);
      objectUrlRef.current = objectUrl;

      // Create Audio Element
      const audio = new Audio();
      audio.src = objectUrl;
      currentAudioRef.current = audio;
      audio.playbackRate = speedRef.current;
      // @ts-ignore
      if ("preservesPitch" in audio) { audio.preservesPitch = true; }

      // Event Listeners
      audio.ontimeupdate = () => {
        setState((prev) => ({
          ...prev,
          currentTime: audio.currentTime,
          duration: audio.duration, // MSE duration updates dynamically
        }));
      };

      audio.onended = () => {
         setState(prev => ({ ...prev, isPlaying: false, isStreaming: false }));
      };

      audio.onerror = (e) => {
          console.error("Audio error", e);
      };

      // Wait for sourceopen
      await new Promise<void>((resolve) => {
          mediaSource.addEventListener("sourceopen", () => {
             // Create SourceBuffer
             try {
                // Determine mime type. Deepgram mp3 is standard.
                // Safari might prefer audio/mp4? Chrome likes audio/mpeg.
                 const mime = MediaSource.isTypeSupported("audio/mpeg") ? "audio/mpeg" : "audio/mp4"; // Fallback logic if needed, but 'audio/mpeg' usually works for mp3 streamed via MSE in Chrome found elsewhere, ACTUALLY: MSE often requires 'audio/mpeg' wrapper (ADTS).
                 // Deepgram returns raw MP3 frames usually.
                 // NOTE: Raw MP3 in MSE is supported in Chrome/FF/Edge but NOT Safari. Safari requires MP4 container (ISOBMFF).
                 // This is a known risk. If user is on Safari, this might fail without transcoding.
                 // Assuming Chrome/Desktop for now as per 'mac' OS reported.

                 const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
                 sourceBufferRef.current = sourceBuffer;

                 sourceBuffer.addEventListener("updateend", () => {
                     processBufferQueue();
                 });
                 resolve();
             } catch (e) {
                 console.error("MSE addSourceBuffer failed", e);
                 toast.error("Browser does not support streaming audio playback.");
                 resolve(); // Continue to allow failure handling
             }
          }, { once: true });
      });

      if (!sourceBufferRef.current) return;

      try {
        await audio.play();
        setState(prev => ({ ...prev, isPlaying: true }));

        // Fetch and append chunks
        for (let i = 0; i < chunks.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;

          setState(prev => ({...prev, currentChunk: i + 1 }));

          const chunk = chunks[i];
          const ttsUrl = getTTSUrl(chunk, undefined, speedRef.current);

          // Debug logs for CORS/fetch
          // console.log("Fetching Chunk", i, ttsUrl);

          const response = await fetch(ttsUrl, {
             signal: abortControllerRef.current.signal
          });

          if (!response.ok) {
             console.error("TTS Fetch failed", response.status, response.statusText);
             continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (abortControllerRef.current?.signal.aborted) break;

          // Push to queue and trigger processing
          bufferQueueRef.current.push(arrayBuffer);
          processBufferQueue();

          if (i === 0) {
             setState(prev => ({ ...prev, isLoading: false }));
          }
        }

        // Wait for buffer to drain then signal EOS
        const checkQueue = setInterval(() => {
            if (abortControllerRef.current?.signal.aborted) {
                clearInterval(checkQueue);
                return;
            }
            if (bufferQueueRef.current.length === 0 && sourceBufferRef.current && !sourceBufferRef.current.updating) {
                if (mediaSourceRef.current && mediaSourceRef.current.readyState === "open") {
                    try {
                       mediaSourceRef.current.endOfStream();
                    } catch (e) { /* ignore */ }
                }
                clearInterval(checkQueue);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        }, 500);

      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) return;
        console.error("TTS error:", error);
        toast.error("Failed to stream audio");
        cleanupAudio();
      }
    },
    [cleanupAudio, processBufferQueue],
  );

  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(async () => {
    if (currentAudioRef.current) {
      await currentAudioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const stop = useCallback(() => {
    cleanupAudio();
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      currentChunk: 0,
      isStreaming: false,
    }));
  }, [cleanupAudio]);

  const seekBy = useCallback((seconds: number) => {
    if (!currentAudioRef.current) return;
    const target = clamp(
      (currentAudioRef.current.currentTime || 0) + seconds,
      0,
      currentAudioRef.current.duration || Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(target)) {
        currentAudioRef.current.currentTime = target;
        setState((prev) => ({ ...prev, currentTime: target }));
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!currentAudioRef.current) return;
    const target = clamp(
      time,
      0,
      currentAudioRef.current.duration || Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(target)) {
        currentAudioRef.current.currentTime = target;
        setState((prev) => ({ ...prev, currentTime: target }));
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const clamped = clamp(speed, 0.5, 2);
    speedRef.current = clamped;
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = clamped;
      // @ts-ignore
      if ("preservesPitch" in currentAudioRef.current) {
        // @ts-ignore
        currentAudioRef.current.preservesPitch = true;
      }
    }
    setState((prev) => ({ ...prev, speed: clamped }));
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <TTSContext.Provider
      value={{
        state,
        playFromText,
        pause,
        resume,
        stop,
        seekBy,
        seekTo,
        setSpeed,
        close,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
}

export function useTTSPlayer() {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error("useTTSPlayer must be used within TTSProvider");
  }
  return context;
}
