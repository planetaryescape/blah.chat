"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useTTSAudioPlayer } from "@/hooks/useTTSAudioPlayer";
import { analytics } from "@/lib/analytics";
import { markdownToSpeechText } from "@/lib/utils/markdownToSpeech";
import { chunkText, clamp, getTTSUrl } from "@/lib/utils/ttsUtils";

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
  playFromText: (options: {
    text: string;
    messageId?: string;
  }) => Promise<void>;
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
  defaultVoice,
}: {
  children: ReactNode;
  defaultSpeed?: number;
  defaultVoice?: string;
}) {
  const voiceRef = useRef(defaultVoice);
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

  const durationRef = useRef(0);

  const audioPlayer = useTTSAudioPlayer({
    defaultSpeed,
    onTimeUpdate: (currentTime, duration) => {
      durationRef.current = duration;
      setState((prev) => ({ ...prev, currentTime, duration }));
    },
    onEnded: () => {
      setState((prev) => ({ ...prev, isPlaying: false, isStreaming: false }));
      analytics.track("tts_playback_completed", {
        playbackDurationMs: durationRef.current * 1000,
      });
    },
    onError: (e) => {
      console.error("[TTS] Audio error", e);
    },
  });

  useEffect(() => {
    const clamped = clamp(defaultSpeed ?? 1, 0.5, 2);
    audioPlayer.setSpeed(clamped);
    setState((prev) => ({ ...prev, speed: clamped }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSpeed, audioPlayer.setSpeed]);

  // Update voice ref when preference changes
  useEffect(() => {
    voiceRef.current = defaultVoice;
  }, [defaultVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioPlayer.cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlayer.cleanupAudio]);

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
        setState((prev) => ({ ...prev, isLoading: false, isVisible: false }));
        return;
      }

      try {
        analytics.track("tts_initiated", {
          messageLength: speechText.length,
          voiceUsed: voiceRef.current ?? "default",
        });

        // Fetch and append chunks
        let failedChunks = 0;
        let successfulChunks = 0;

        for (let i = 0; i < chunks.length; i++) {
          if (audioPlayer.isAborted()) break;

          setState((prev) => ({ ...prev, currentChunk: i + 1 }));

          const chunk = chunks[i];
          const ttsUrl = getTTSUrl(
            chunk,
            voiceRef.current,
            audioPlayer.speedRef.current,
          );

          const response = await fetch(ttsUrl, {
            signal: audioPlayer.getAbortSignal(),
          });

          if (!response.ok) {
            failedChunks++;

            // If all chunks failed, show error and cleanup
            if (failedChunks === chunks.length) {
              toast.error(
                "Failed to generate speech. Check your TTS settings.",
              );
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isPlaying: false,
                isVisible: false,
              }));
              audioPlayer.cleanupAudio();
              return;
            }
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (audioPlayer.isAborted()) break;

          audioPlayer.appendBuffer(arrayBuffer);
          successfulChunks++;

          // Start playback after first chunk arrives
          if (successfulChunks === 1) {
            try {
              await audioPlayer.play();
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isPlaying: true,
              }));
            } catch {
              // Continue anyway - some browsers may auto-resume
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          }
        }

        audioPlayer.endStream();
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        if (audioPlayer.isAborted()) return;
        console.error("[TTS] Error:", error);
        toast.error("Failed to stream audio");
        audioPlayer.cleanupAudio();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
        }));
      }
    },
    [audioPlayer],
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
    [audioPlayer],
  );

  const seekTo = useCallback(
    (time: number) => {
      audioPlayer.seekTo(time);
    },
    [audioPlayer],
  );

  const setSpeed = useCallback(
    (speed: number) => {
      const clamped = audioPlayer.setSpeed(speed);
      setState((prev) => ({ ...prev, speed: clamped }));
    },
    [audioPlayer],
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
