"use client";

import type { SpeechSegment } from "@blah-chat/backend/convex/lib/speech/types";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { clamp } from "@/lib/utils/ttsUtils";

interface UseTTSAudioPlayerOptions {
  defaultSpeed?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSegment?: (segment: SpeechSegment, index: number) => void;
  onPlaying?: (playing: boolean) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

interface PlaybackSession {
  controller: AbortController;
  audio: HTMLAudioElement | null;
  url: string | null;
  paused: boolean;
  playAttempt: number;
  offset: number;
  segments: SpeechSegment[];
  durations: number[];
  gap: {
    remaining: number;
    started: number;
    timer?: ReturnType<typeof setTimeout>;
    progressTimer?: ReturnType<typeof setInterval>;
    total: number;
    resume: () => void;
  } | null;
}

/** One owned Blob at a time: bounded memory, ordered speech, real semantic gaps. */
export function useTTSAudioPlayer(options: UseTTSAudioPlayerOptions = {}) {
  const callbacks = useRef(options);
  useLayoutEffect(() => {
    callbacks.current = options;
  });
  const sessionRef = useRef<PlaybackSession | null>(null);
  const speedRef = useRef(clamp(options.defaultSpeed ?? 1, 0.5, 2));

  const cleanupAudio = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    session.controller.abort();
    if (session.gap?.timer) clearTimeout(session.gap.timer);
    if (session.gap?.progressTimer) clearInterval(session.gap.progressTimer);
    if (session.audio) {
      session.audio.onended = null;
      session.audio.onerror = null;
      session.audio.ontimeupdate = null;
      session.audio.onloadedmetadata = null;
      session.audio.pause();
      session.audio.removeAttribute("src");
      session.audio.load();
    }
    if (session.url) URL.revokeObjectURL(session.url);
  }, []);

  useEffect(() => cleanupAudio, [cleanupAudio]);

  const reportTime = useCallback((session: PlaybackSession) => {
    if (sessionRef.current !== session) return;
    const duration = session.durations.reduce(
      (sum, seconds, i) =>
        sum + seconds + session.segments[i].pauseAfterMs / 1000,
      0,
    );
    const gap = session.gap;
    const gapElapsed = gap
      ? gap.total -
        gap.remaining +
        (gap.timer ? Math.min(gap.remaining, Date.now() - gap.started) : 0)
      : 0;
    callbacks.current.onTimeUpdate?.(
      session.offset +
        (gap ? gapElapsed / 1000 : (session.audio?.currentTime ?? 0)),
      duration,
    );
  }, []);

  const play = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const attempt = ++session.playAttempt;
    session.paused = false;
    if (session.gap) {
      session.gap.resume();
    } else if (session.audio) {
      const audio = session.audio;
      try {
        await audio.play();
        if (sessionRef.current !== session || session.paused) {
          audio.pause();
          return;
        }
        if (session.playAttempt !== attempt) return;
      } catch (error) {
        // pause() can reject an outstanding browser play() promise (AbortError).
        // A deliberate pause is not a failed narration.
        if (
          sessionRef.current !== session ||
          session.paused ||
          session.playAttempt !== attempt
        )
          return;
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          // Retain this exact section and Blob for a gesture-bound Resume.
          session.paused = true;
          callbacks.current.onPlaying?.(false);
          return;
        }
        cleanupAudio();
        callbacks.current.onError?.(
          new Error("Audio playback failed. Please try Speak again."),
        );
        return;
      }
    }
    if (sessionRef.current === session && session.playAttempt === attempt)
      callbacks.current.onPlaying?.(true);
  }, [cleanupAudio]);

  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.playAttempt++;
    session.paused = true;
    session.audio?.pause();
    const gap = session.gap;
    if (gap?.timer) {
      clearInterval(gap.progressTimer);
      gap.progressTimer = undefined;
      clearTimeout(gap.timer);
      gap.timer = undefined;
      gap.remaining = Math.max(0, gap.remaining - (Date.now() - gap.started));
    }
    callbacks.current.onPlaying?.(false);
  }, []);

  const start = useCallback(
    async (
      segments: SpeechSegment[],
      loadSegment: (
        segment: SpeechSegment,
        signal: AbortSignal,
      ) => Promise<Blob>,
    ) => {
      cleanupAudio();
      // This is feature detection, not parsing untrusted input. Older browsers
      // may lack the HTMLAudio/Blob URL adapter entirely.
      if (
        typeof Audio === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        callbacks.current.onError?.(
          new Error("This browser does not support audio playback."),
        );
        return;
      }
      const session: PlaybackSession = {
        controller: new AbortController(),
        audio: null,
        url: null,
        paused: false,
        playAttempt: 0,
        offset: 0,
        segments,
        durations: segments.map((segment) =>
          Math.max(1, segment.text.length / 14),
        ),
        gap: null,
      };
      sessionRef.current = session;
      const signal = session.controller.signal;
      const active = () => sessionRef.current === session && !signal.aborted;
      try {
        for (const [i, segment] of segments.entries()) {
          const blob = await loadSegment(segment, signal);
          if (!active()) return;
          if (!blob.size)
            throw new Error("Speech returned empty audio. Playback stopped.");
          const audio = new Audio();
          session.audio = audio;
          session.url = URL.createObjectURL(blob);
          audio.src = session.url;
          audio.playbackRate = speedRef.current;
          audio.preservesPitch = true;
          callbacks.current.onSegment?.(segment, i);
          await new Promise<void>((resolve, reject) => {
            const abort = () => {
              reject(new DOMException("Cancelled", "AbortError"));
            };
            signal.addEventListener("abort", abort, { once: true });
            audio.onloadedmetadata = () => {
              if (!active()) return;
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                session.durations[i] = audio.duration;
              }
              reportTime(session);
            };
            audio.ontimeupdate = () => {
              reportTime(session);
            };
            audio.onended = () => {
              if (!active()) return;
              signal.removeEventListener("abort", abort);
              session.durations[i] =
                Number.isFinite(audio.duration) && audio.duration > 0
                  ? audio.duration
                  : audio.currentTime;
              resolve();
            };
            audio.onerror = () => {
              if (!active()) return;
              signal.removeEventListener("abort", abort);
              reject(
                new Error(
                  "Audio could not be played. Playback stopped without skipping this section.",
                ),
              );
            };
            if (!session.paused) void play();
          });
          if (!active()) return;
          audio.onended = null;
          audio.onerror = null;
          audio.ontimeupdate = null;
          audio.onloadedmetadata = null;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          session.audio = null;
          URL.revokeObjectURL(session.url);
          session.url = null;
          session.offset += session.durations[i];
          reportTime(session);
          // A gap starts only after the actual audio ended, never from an estimate.
          await new Promise<void>((resolve, reject) => {
            const abort = () => {
              reject(new DOMException("Cancelled", "AbortError"));
            };
            signal.addEventListener("abort", abort, { once: true });
            const gap: NonNullable<PlaybackSession["gap"]> = {
              remaining: segment.pauseAfterMs,
              total: segment.pauseAfterMs,
              started: 0,
              timer: undefined,
              resume: () => {
                if (!active() || session.paused || gap.timer) return;
                gap.started = Date.now();
                gap.progressTimer = setInterval(() => {
                  reportTime(session);
                }, 50);
                gap.timer = setTimeout(() => {
                  clearInterval(gap.progressTimer);
                  if (!active()) return;
                  signal.removeEventListener("abort", abort);
                  session.gap = null;
                  session.offset += segment.pauseAfterMs / 1000;
                  reportTime(session);
                  resolve();
                }, gap.remaining);
              },
            };
            session.gap = gap;
            gap.resume();
          });
          if (!active()) return;
        }
        if (!active()) return;
        cleanupAudio();
        callbacks.current.onEnded?.();
      } catch (error) {
        if (!active()) return;
        cleanupAudio();
        callbacks.current.onError?.(
          error instanceof Error ? error : new Error("Speech playback failed."),
        );
      }
    },
    [cleanupAudio, play, reportTime],
  );

  // Unknown/unloaded durations must never silently skip source segments. Seek is
  // deliberately local to the currently loaded section; offsets remain source-linked.
  const seekTo = useCallback(
    (time: number) => {
      const session = sessionRef.current;
      const audio = session?.audio;
      if (!session || !audio || !Number.isFinite(audio.duration)) return false;
      const local = time - session.offset;
      if (local < 0 || local > audio.duration) return false;
      audio.currentTime = local;
      reportTime(session);
      return true;
    },
    [reportTime],
  );

  const seekBy = useCallback(
    (seconds: number) => {
      const session = sessionRef.current;
      return session
        ? seekTo(session.offset + (session.audio?.currentTime ?? 0) + seconds)
        : false;
    },
    [seekTo],
  );

  const setSpeed = useCallback((speed: number) => {
    speedRef.current = clamp(speed, 0.5, 2);
    if (sessionRef.current?.audio)
      sessionRef.current.audio.playbackRate = speedRef.current;
    return speedRef.current;
  }, []);

  return {
    start,
    play,
    pause,
    resume: play,
    stop: cleanupAudio,
    cleanupAudio,
    seekBy,
    seekTo,
    setSpeed,
    speedRef,
  };
}
