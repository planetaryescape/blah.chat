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

export function TTSProvider({
  children,
  defaultSpeed = 1,
}: {
  children: ReactNode;
  defaultSpeed?: number;
}) {
  // Workaround for Convex type instantiation depth issue (TS2589)
  // Access via bracket notation to bypass deep type inference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateSpeech = useAction((api as any).tts.generateSpeech) as (
    args: GenerateSpeechInput,
  ) => Promise<GenerateSpeechResult>;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const speedRef = useRef(clamp(defaultSpeed ?? 1, 0.5, 2));

  const [state, setState] = useState<TTSState>({
    isVisible: false,
    isLoading: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    speed: clamp(defaultSpeed ?? 1, 0.5, 2),
    sourceMessageId: undefined,
    previewText: "",
  });

  // Keep speed in sync with user preference once it loads
  useEffect(() => {
    const clamped = clamp(defaultSpeed ?? 1, 0.5, 2);
    speedRef.current = clamped;
    setState((prev) => ({ ...prev, speed: clamped }));
  }, [defaultSpeed]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    audioRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
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
    }));
  }, [cleanupAudio]);

  const playFromText = useCallback(
    async ({ text, messageId }: { text: string; messageId?: string }) => {
      const speechText = markdownToSpeechText(text);
      if (!speechText) {
        toast.error("This message is empty after removing formatting.");
        return;
      }

      setState((prev) => ({
        ...prev,
        isVisible: true,
        isLoading: true,
        isPlaying: false,
        sourceMessageId: messageId,
        previewText: speechText.slice(0, 220),
        currentTime: 0,
        duration: 0,
      }));

      try {
        const result = await generateSpeech({
          text: speechText,
          speed: speedRef.current,
        });

        // Convert base64 to audio blob
        const audioData = atob(result.audioBase64);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: result.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        cleanupAudio();
        objectUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Preserve pitch when speeding up (where supported)
        // @ts-ignore - not universally available
        if (audio && "preservesPitch" in audio) {
          // @ts-ignore
          audio.preservesPitch = true;
        }
        audio.playbackRate = speedRef.current || 1;

        audio.onloadedmetadata = () => {
          setState((prev) => ({
            ...prev,
            duration: audio.duration || prev.duration,
          }));
        };

        audio.ontimeupdate = () => {
          setState((prev) => ({
            ...prev,
            currentTime: audio.currentTime,
            duration: audio.duration || prev.duration,
          }));
        };

        audio.onended = () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            currentTime: audio.duration || prev.currentTime,
          }));
        };

        audio.onpause = () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
        };

        audio.onplay = () => {
          setState((prev) => ({
            ...prev,
            isPlaying: true,
            isLoading: false,
            isVisible: true,
          }));
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          toast.error("Failed to play audio");
          close();
        };

        await audio.play();
      } catch (error) {
        console.error("TTS error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          isVisible: false,
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
    [cleanupAudio, close, generateSpeech],
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(async () => {
    if (audioRef.current) {
      await audioRef.current.play();
    }
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  const seekBy = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const target = clamp(
      (audioRef.current.currentTime || 0) + seconds,
      0,
      audioRef.current.duration || Number.POSITIVE_INFINITY,
    );
    audioRef.current.currentTime = target;
    setState((prev) => ({ ...prev, currentTime: target }));
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    const target = clamp(
      time,
      0,
      audioRef.current.duration || Number.POSITIVE_INFINITY,
    );
    audioRef.current.currentTime = target;
    setState((prev) => ({ ...prev, currentTime: target }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    const clamped = clamp(speed, 0.5, 2);
    speedRef.current = clamped;
    if (audioRef.current) {
      audioRef.current.playbackRate = clamped;
      // @ts-ignore - not universally available
      if ("preservesPitch" in audioRef.current) {
        // @ts-ignore
        audioRef.current.preservesPitch = true;
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
