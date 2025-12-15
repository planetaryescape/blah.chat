"use client";

import { useTTSAudioPlayer } from "@/hooks/useTTSAudioPlayer";
import { analytics } from "@/lib/analytics";
import { markdownToSpeechText } from "@/lib/utils/markdownToSpeech";
import { chunkText, clamp, getTTSUrl } from "@/lib/utils/ttsUtils";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
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

export function TTSProvider({
  children,
  defaultSpeed = 1,
}: {
  children: ReactNode;
  defaultSpeed?: number;
}) {
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

  const audioPlayer = useTTSAudioPlayer({
    defaultSpeed,
    onTimeUpdate: (currentTime, duration) => {
      setState((prev) => ({ ...prev, currentTime, duration }));
    },
    onEnded: () => {
      setState((prev) => ({ ...prev, isPlaying: false, isStreaming: false }));
      analytics.track("tts_playback_completed", {
        playbackDurationMs: state.duration * 1000,
      });
    },
    onError: (e) => {
      console.error("Audio error", e);
    },
  });

  useEffect(() => {
    const clamped = clamp(defaultSpeed ?? 1, 0.5, 2);
    audioPlayer.setSpeed(clamped);
    setState((prev) => ({ ...prev, speed: clamped }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSpeed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioPlayer.cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    audioPlayer.cleanupAudio();
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
  }, [audioPlayer]);

  const playFromText = useCallback(
    async ({ text, messageId }: { text: string; messageId?: string }) => {
      const speechText = markdownToSpeechText(text);
      if (!speechText) {
        toast.error("This message is empty after removing formatting.");
        return;
      }

      const chunks = chunkText(speechText);
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

      const audio = await audioPlayer.initializeAudio();
      if (!audio) {
        toast.error("Browser does not support streaming audio playback.");
        return;
      }

      try {
        await audioPlayer.play();
        setState((prev) => ({ ...prev, isPlaying: true }));

        analytics.track("tts_initiated", {
          messageLength: speechText.length,
          voiceUsed: "default",
        });

        // Fetch and append chunks
        for (let i = 0; i < chunks.length; i++) {
          if (audioPlayer.isAborted()) break;

          setState((prev) => ({ ...prev, currentChunk: i + 1 }));

          const chunk = chunks[i];
          const ttsUrl = getTTSUrl(chunk, undefined, audioPlayer.speedRef.current);

          const response = await fetch(ttsUrl, {
            signal: audioPlayer.getAbortSignal(),
          });

          if (!response.ok) {
            console.error("TTS Fetch failed", response.status, response.statusText);
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (audioPlayer.isAborted()) break;

          audioPlayer.appendBuffer(arrayBuffer);

          if (i === 0) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        }

        audioPlayer.endStream();
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        if (audioPlayer.isAborted()) return;
        console.error("TTS error:", error);
        toast.error("Failed to stream audio");
        audioPlayer.cleanupAudio();
      }
    },
    [audioPlayer]
  );

  const pause = useCallback(() => {
    audioPlayer.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [audioPlayer]);

  const resume = useCallback(async () => {
    await audioPlayer.resume();
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [audioPlayer]);

  const stop = useCallback(() => {
    audioPlayer.stop();
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      currentChunk: 0,
      isStreaming: false,
    }));
  }, [audioPlayer]);

  const seekBy = useCallback(
    (seconds: number) => {
      audioPlayer.seekBy(seconds);
    },
    [audioPlayer]
  );

  const seekTo = useCallback(
    (time: number) => {
      audioPlayer.seekTo(time);
    },
    [audioPlayer]
  );

  const setSpeed = useCallback(
    (speed: number) => {
      const clamped = audioPlayer.setSpeed(speed);
      setState((prev) => ({ ...prev, speed: clamped }));
    },
    [audioPlayer]
  );

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
