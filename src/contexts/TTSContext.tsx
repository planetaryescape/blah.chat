"use client";

import { api } from "@/convex/_generated/api";
import { markdownToSpeechText } from "@/lib/utils/markdownToSpeech";
import { useAction } from "convex/react";
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

type GenerateSpeechInput = {
  text: string;
  voice?: string;
  speed?: number;
};

type GenerateSpeechResult = {
  audioBase64: string;
  provider: string;
  mimeType: string;
  cost: number;
  characterCount: number;
  chunks?: number;
};

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

// Deepgram has 2000 char limit - chunk at sentence boundaries
const CHUNK_LIMIT = 1900;

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

    if (lastPeriod > maxChars * 0.5) {
      splitIndex = lastPeriod + 1;
    } else {
      const lastComma = searchArea.lastIndexOf(", ");
      if (lastComma > maxChars * 0.5) {
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

function base64ToBlob(base64: string, mimeType: string): Blob {
  const audioData = atob(base64);
  const audioArray = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    audioArray[i] = audioData.charCodeAt(i);
  }
  return new Blob([audioArray], { type: mimeType });
}

export function TTSProvider({
  children,
  defaultSpeed = 1,
}: {
  children: ReactNode;
  defaultSpeed?: number;
}) {
  // @ts-ignore - Type instantiation is excessively deep
  const generateSpeech: (
    args: GenerateSpeechInput,
  ) => Promise<GenerateSpeechResult> = useAction(api.tts.generateSpeech);

  // Audio queue for streaming playback
  const audioQueueRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speedRef = useRef(clamp(defaultSpeed ?? 1, 0.5, 2));
  const isPlayingRef = useRef(false);
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
      currentAudioRef.current.src = "";
    }
    currentAudioRef.current = null;
    audioQueueRef.current = [];

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cleanupAudio();
    isPlayingRef.current = false;
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

  // Play next audio from queue
  const playNextFromQueue = useCallback(async () => {
    if (!isPlayingRef.current || audioQueueRef.current.length === 0) return;

    const blob = audioQueueRef.current.shift();
    if (!blob) return;

    // Cleanup previous
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const audioUrl = URL.createObjectURL(blob);
    objectUrlRef.current = audioUrl;

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    // @ts-ignore
    if ("preservesPitch" in audio) {
      // @ts-ignore
      audio.preservesPitch = true;
    }
    audio.playbackRate = speedRef.current;

    audio.ontimeupdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: prev.currentTime + (audio.currentTime - (prev.currentTime % audio.duration || 0)),
      }));
    };

    audio.onended = () => {
      setState((prev) => ({
        ...prev,
        currentChunk: prev.currentChunk + 1,
      }));
      // Play next chunk if available
      if (audioQueueRef.current.length > 0) {
        playNextFromQueue();
      } else {
        // Check if still loading more chunks
        setState((prev) => {
          if (prev.currentChunk >= prev.totalChunks && !prev.isLoading) {
            isPlayingRef.current = false;
            return { ...prev, isPlaying: false, isStreaming: false };
          }
          return prev;
        });
      }
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      toast.error("Failed to play audio chunk");
    };

    try {
      await audio.play();
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isLoading: prev.currentChunk < prev.totalChunks - 1,
      }));
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  }, []);

  const playFromText = useCallback(
    async ({ text, messageId }: { text: string; messageId?: string }) => {
      const speechText = markdownToSpeechText(text);
      if (!speechText) {
        toast.error("This message is empty after removing formatting.");
        return;
      }

      // Cleanup previous playback
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

      isPlayingRef.current = true;

      try {
        // Generate and play chunks as they come
        for (let i = 0; i < chunks.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;

          const chunk = chunks[i];

          // Generate audio for this chunk
          const result = await generateSpeech({
            text: chunk,
            speed: speedRef.current,
          });

          if (abortControllerRef.current?.signal.aborted) break;

          // Convert to blob and add to queue
          const blob = base64ToBlob(result.audioBase64, result.mimeType);
          audioQueueRef.current.push(blob);

          // Start playing immediately when first chunk is ready
          if (i === 0 && isPlayingRef.current) {
            setState((prev) => ({ ...prev, isLoading: false }));
            await playNextFromQueue();
          }
          // If currently idle (finished previous chunk), start next
          else if (!currentAudioRef.current?.paused === false && audioQueueRef.current.length > 0) {
            await playNextFromQueue();
          }
        }
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) return;

        console.error("TTS error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          isVisible: false,
          isStreaming: false,
        }));

        if (error instanceof Error) {
          if (error.message.includes("TTS disabled")) {
            toast.error("Text-to-speech is disabled. Enable it in settings.");
          } else {
            toast.error(`TTS failed: ${error.message}`);
          }
        } else {
          toast.error("Failed to generate speech");
        }
      }
    },
    [cleanupAudio, generateSpeech, playNextFromQueue],
  );

  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    isPlayingRef.current = false;
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(async () => {
    isPlayingRef.current = true;
    if (currentAudioRef.current) {
      await currentAudioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    } else if (audioQueueRef.current.length > 0) {
      await playNextFromQueue();
    }
  }, [playNextFromQueue]);

  const stop = useCallback(() => {
    cleanupAudio();
    isPlayingRef.current = false;
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
    currentAudioRef.current.currentTime = target;
    setState((prev) => ({ ...prev, currentTime: target }));
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!currentAudioRef.current) return;
    const target = clamp(
      time,
      0,
      currentAudioRef.current.duration || Number.POSITIVE_INFINITY,
    );
    currentAudioRef.current.currentTime = target;
    setState((prev) => ({ ...prev, currentTime: target }));
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
