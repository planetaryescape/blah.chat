"use client";

import type {
  PreparedNarration,
  SpeechSegment,
} from "@blah-chat/backend/convex/lib/speech/types";
import { useAuth } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { useAction } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useTTSAudioPlayer } from "@/hooks/useTTSAudioPlayer";
import { analytics } from "@/lib/analytics";
import { clamp, getTTSUrl } from "@/lib/utils/ttsUtils";

// Message IDs already travel as strings through Speak; Convex validates IDs/access.
const prepareNarration = makeFunctionReference<
  "action",
  { text: string; messageId?: string; requestId: string },
  PreparedNarration
>("speechPreparation:prepare");
const cancelNarration = makeFunctionReference<
  "mutation",
  { requestId: string },
  null
>("speechPreparation:cancel");

interface TTSState {
  isVisible: boolean;
  isLoading: boolean;
  isPreparing: boolean;
  isPlaying: boolean;
  canResume: boolean;
  canRetry: boolean;
  duration: number;
  currentTime: number;
  speed: number;
  sourceMessageId?: string;
  previewText?: string;
  totalChunks: number;
  currentChunk: number;
  isStreaming: boolean;
  warning?: string;
  activeSegment?: SpeechSegment;
  sourceHash?: string;
}

interface TTSContextValue {
  state: TTSState;
  playFromText: (options: {
    text: string;
    messageId?: string;
  }) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  retry: () => void;
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
  const { getToken, userId, isLoaded } = useAuth();
  const prepare = useAction(prepareNarration);
  const identity = isLoaded ? userId : undefined;
  const identityRef = useRef(identity);
  const generation = useRef(0);
  const mounted = useRef(true);
  const retrySource = useRef<{
    text: string;
    messageId?: string;
    owner: string;
  } | null>(null);
  const preparation = useRef<{ requestId: string; token: string } | null>(null);
  const cancelPreparation = useCallback(() => {
    const pending = preparation.current;
    preparation.current = null;
    if (!pending) return;
    // Use the JWT captured before this request, never a token obtained after an
    // account switch. Cancellation is best effort and never leaks a rejection.
    try {
      const client = new ConvexHttpClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
      );
      client.setAuth(pending.token);
      void client
        .mutation(cancelNarration, { requestId: pending.requestId })
        .catch(() => undefined);
    } catch {
      // Offline/misconfigured clients still stop locally; server deadlines bound work.
    }
  }, []);
  const [state, setState] = useState<TTSState>({
    isVisible: false,
    isLoading: false,
    isPreparing: false,
    isPlaying: false,
    canResume: false,
    canRetry: false,
    duration: 0,
    currentTime: 0,
    speed: clamp(defaultSpeed, 0.5, 2),
    totalChunks: 0,
    currentChunk: 0,
    isStreaming: false,
  });
  const sessionOwner = useRef<string | null | undefined>(undefined);
  const validOwner = useCallback(
    () =>
      mounted.current &&
      !!sessionOwner.current &&
      sessionOwner.current === identityRef.current,
    [],
  );
  const fail = (error: Error) => {
    if (!validOwner()) return;
    generation.current++;
    toast.error(error.message);
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isPreparing: false,
      isPlaying: false,
      isStreaming: false,
      canResume: false,
      canRetry: error.name === "SpeechBusyError",
      warning: error.message,
    }));
  };
  const durationRef = useRef(0);
  const audioPlayer = useTTSAudioPlayer({
    defaultSpeed,
    onTimeUpdate: (currentTime, duration) => {
      if (!validOwner()) return;
      durationRef.current = duration;
      setState((prev) => ({ ...prev, currentTime, duration }));
    },
    onSegment: (activeSegment, index) => {
      if (!validOwner()) return;
      setState((prev) => ({
        ...prev,
        activeSegment,
        currentChunk: index + 1,
        isLoading: false,
        canResume: true,
      }));
    },
    onPlaying: (isPlaying) => {
      if (validOwner()) setState((prev) => ({ ...prev, isPlaying }));
    },
    onEnded: () => {
      if (!validOwner()) return;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isStreaming: false,
        canResume: false,
      }));
      analytics.track("tts_playback_completed", {
        playbackDurationMs: durationRef.current * 1000,
      });
    },
    onError: fail,
  });
  const {
    cleanupAudio,
    start,
    pause: pauseAudio,
    resume: resumeAudio,
    setSpeed: setAudioSpeed,
    seekBy: seekAudioBy,
    seekTo: seekAudioTo,
  } = audioPlayer;

  const stop = useCallback(() => {
    generation.current++;
    retrySource.current = null;
    cancelPreparation();
    cleanupAudio();
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isPreparing: false,
      isPlaying: false,
      canResume: false,
      canRetry: false,
      isStreaming: false,
      currentTime: 0,
      currentChunk: 0,
    }));
  }, [cancelPreparation, cleanupAudio]);

  const close = useCallback(() => {
    stop();
    setState((prev) => ({
      ...prev,
      isVisible: false,
      sourceMessageId: undefined,
      previewText: "",
      warning: undefined,
      activeSegment: undefined,
      sourceHash: undefined,
      totalChunks: 0,
      duration: 0,
    }));
  }, [stop]);

  useLayoutEffect(() => {
    identityRef.current = identity;
    close();
  }, [identity, close]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      cancelPreparation();
      cleanupAudio();
    };
  }, [cancelPreparation, cleanupAudio]);

  // Preference changes affect the next session, not in-flight synthesis parameters.
  const preferences = useRef({ voice: defaultVoice, speed: defaultSpeed });
  useLayoutEffect(() => {
    preferences.current.voice = defaultVoice;
  }, [defaultVoice]);
  useLayoutEffect(() => {
    preferences.current.speed = defaultSpeed;
  }, [defaultSpeed]);

  const playFromText = useCallback(
    async ({ text, messageId }: { text: string; messageId?: string }) => {
      const run = ++generation.current;
      cancelPreparation();
      cleanupAudio();
      const owner = identityRef.current;
      sessionOwner.current = owner;
      const active = () =>
        mounted.current &&
        generation.current === run &&
        !!owner &&
        identityRef.current === owner;
      if (!text.trim()) return;
      retrySource.current = owner ? { text, messageId, owner } : null;
      const { voice, speed } = preferences.current;
      const sessionSpeed = setAudioSpeed(speed);
      setState((prev) => ({
        ...prev,
        isVisible: true,
        isLoading: true,
        isPreparing: true,
        isPlaying: false,
        canResume: false,
        canRetry: false,
        sourceMessageId: messageId,
        previewText: text.slice(0, 220),
        currentTime: 0,
        duration: 0,
        totalChunks: 0,
        currentChunk: 0,
        isStreaming: false,
        warning: undefined,
        activeSegment: undefined,
        sourceHash: undefined,
        speed: sessionSpeed,
      }));
      try {
        if (!owner)
          throw new Error("Speech requires an authenticated session.");
        const token = await getToken({ template: "convex" });
        if (!active()) return;
        if (!token)
          throw new Error("Speech requires an authenticated session.");
        const requestId = crypto.randomUUID();
        preparation.current = { requestId, token };
        // Authoritative Markdown reaches preparation unchanged. No paid call before JWT.
        const narration = await prepare({ text, messageId, requestId });
        if (!active()) return;
        if (!narration.segments.length)
          throw new Error("This message has no speech to play.");
        const warning =
          narration.coverage === "partial"
            ? `Partial narration: ${narration.warnings.join(" ") || "Some visual or structural content could not be fully read."}`
            : narration.warnings.length
              ? narration.warnings.join(" ")
              : undefined;
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          totalChunks: narration.segments.length,
          isStreaming: true,
          sourceHash: narration.sourceHash,
          warning,
        }));
        if (warning) toast.warning(warning);
        analytics.track("tts_initiated", {
          messageLength: text.length,
          voiceUsed: voice ?? "default",
        });
        await start(narration.segments, async (segment, signal) => {
          if (!active()) throw new DOMException("Cancelled", "AbortError");
          // Narrations can outlive Clerk's short-lived JWT; refresh normally for
          // each section, never retry an authorization failure.
          const audioToken = await getToken({ template: "convex" });
          if (!active()) throw new DOMException("Cancelled", "AbortError");
          if (!audioToken)
            throw new Error("Speech requires an authenticated session.");
          const request = new AbortController();
          const deadline = setTimeout(() => {
            request.abort();
          }, 45_000);
          const abort = () => {
            clearTimeout(deadline);
            request.abort();
          };
          signal.addEventListener("abort", abort, { once: true });
          try {
            const response = await fetch(getTTSUrl(), {
              method: "POST",
              headers: {
                Authorization: `Bearer ${audioToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: segment.text,
                voice,
                // Rate is applied by the browser once, not again by synthesis.
                speed: 1,
              }),
              signal: request.signal,
            });
            if (response.status === 409) {
              const busy = new Error(
                "Speech is already being generated. Retry shortly.",
              );
              busy.name = "SpeechBusyError";
              throw busy;
            }
            if (!response.ok)
              throw new Error(
                "Speech generation failed. Playback stopped without skipping this section.",
              );
            const blob = await response.blob();
            if (request.signal.aborted)
              throw new DOMException("Cancelled", "AbortError");
            if (!active()) throw new DOMException("Cancelled", "AbortError");
            return blob;
          } catch (error) {
            if (request.signal.aborted && !signal.aborted)
              throw new Error(
                "Speech generation timed out. Playback stopped without skipping this section.",
              );
            throw error;
          } finally {
            clearTimeout(deadline);
            signal.removeEventListener("abort", abort);
          }
        });
      } catch (error) {
        if (
          mounted.current &&
          generation.current === run &&
          identityRef.current === owner
        ) {
          cleanupAudio();
          toast.error(
            error instanceof Error
              ? error.message
              : "Speech preparation failed.",
          );
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isPreparing: false,
            isPlaying: false,
            isStreaming: false,
            canResume: false,
            warning: "Speech could not be prepared. Try Speak again.",
          }));
        }
      }
    },
    [cancelPreparation, cleanupAudio, getToken, prepare, setAudioSpeed, start],
  );

  const retry = useCallback(() => {
    const source = retrySource.current;
    if (source && mounted.current && identityRef.current === source.owner)
      void playFromText(source);
  }, [playFromText]);

  const pause = useCallback(() => {
    pauseAudio();
  }, [pauseAudio]);
  const resume = useCallback(async () => {
    if (validOwner()) await resumeAudio();
  }, [resumeAudio, validOwner]);
  const seekBy = useCallback(
    (seconds: number) => {
      if (!seekAudioBy(seconds))
        toast.info("Seeking is limited to the current loaded section.");
    },
    [seekAudioBy],
  );
  const seekTo = useCallback(
    (time: number) => {
      if (!seekAudioTo(time))
        toast.info("Seeking is limited to the current loaded section.");
    },
    [seekAudioTo],
  );
  const setSpeed = useCallback(
    (speed: number) => {
      const clamped = setAudioSpeed(speed);
      preferences.current.speed = clamped;
      setState((prev) => ({ ...prev, speed: clamped }));
    },
    [setAudioSpeed],
  );

  return (
    <TTSContext.Provider
      value={{
        state,
        playFromText,
        pause,
        resume,
        retry,
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
  if (!context) throw new Error("useTTSPlayer must be used within TTSProvider");
  return context;
}
