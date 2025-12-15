"use client";

import { clamp } from "@/lib/utils/ttsUtils";
import { useCallback, useRef } from "react";

export interface TTSAudioState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

interface UseTTSAudioPlayerOptions {
  defaultSpeed?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Hook for managing MSE (Media Source Extensions) audio playback.
 * Handles audio element, MediaSource, SourceBuffer, and buffer queue.
 */
export function useTTSAudioPlayer(options: UseTTSAudioPlayerOptions = {}) {
  const { defaultSpeed = 1, onTimeUpdate, onEnded, onError } = options;

  // MSE Refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const bufferQueueRef = useRef<ArrayBuffer[]>([]);
  const isAppendingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const speedRef = useRef(clamp(defaultSpeed, 0.5, 2));
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Process the buffer queue safely - appends next buffer when ready.
   */
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

  /**
   * Cleanup all audio resources.
   */
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
      } catch (_e) {
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

  /**
   * Initialize MSE audio playback with a new MediaSource.
   */
  const initializeAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    cleanupAudio();
    abortControllerRef.current = new AbortController();

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
    if ("preservesPitch" in audio) {
      audio.preservesPitch = true;
    }

    // Event Listeners
    audio.ontimeupdate = () => {
      onTimeUpdate?.(audio.currentTime, audio.duration);
    };

    audio.onended = () => {
      onEnded?.();
    };

    audio.onerror = (e: Event | string) => {
      console.error("Audio error", e);
      if (typeof e !== "string" && e instanceof Event) {
        onError?.(e);
      }
    };

    // Wait for sourceopen
    await new Promise<void>((resolve) => {
      mediaSource.addEventListener(
        "sourceopen",
        () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
            sourceBufferRef.current = sourceBuffer;

            sourceBuffer.addEventListener("updateend", () => {
              processBufferQueue();
            });
            resolve();
          } catch (e) {
            console.error("MSE addSourceBuffer failed", e);
            resolve();
          }
        },
        { once: true }
      );
    });

    return sourceBufferRef.current ? audio : null;
  }, [cleanupAudio, processBufferQueue, onTimeUpdate, onEnded, onError]);

  /**
   * Append audio buffer to the queue.
   */
  const appendBuffer = useCallback(
    (buffer: ArrayBuffer) => {
      bufferQueueRef.current.push(buffer);
      processBufferQueue();
    },
    [processBufferQueue]
  );

  /**
   * Signal end of stream when all buffers are processed.
   */
  const endStream = useCallback(() => {
    const checkQueue = setInterval(() => {
      if (abortControllerRef.current?.signal.aborted) {
        clearInterval(checkQueue);
        return;
      }
      if (
        bufferQueueRef.current.length === 0 &&
        sourceBufferRef.current &&
        !sourceBufferRef.current.updating
      ) {
        if (
          mediaSourceRef.current &&
          mediaSourceRef.current.readyState === "open"
        ) {
          try {
            mediaSourceRef.current.endOfStream();
          } catch (_e) {
            /* ignore */
          }
        }
        clearInterval(checkQueue);
      }
    }, 500);
  }, []);

  /**
   * Play the audio element.
   */
  const play = useCallback(async () => {
    if (currentAudioRef.current) {
      await currentAudioRef.current.play();
    }
  }, []);

  /**
   * Pause playback.
   */
  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
  }, []);

  /**
   * Resume playback.
   */
  const resume = useCallback(async () => {
    if (currentAudioRef.current) {
      await currentAudioRef.current.play();
    }
  }, []);

  /**
   * Stop and reset playback.
   */
  const stop = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  /**
   * Seek by a relative amount of seconds.
   */
  const seekBy = useCallback((seconds: number) => {
    if (!currentAudioRef.current) return;
    const target = clamp(
      (currentAudioRef.current.currentTime || 0) + seconds,
      0,
      currentAudioRef.current.duration || Number.POSITIVE_INFINITY
    );
    if (Number.isFinite(target)) {
      currentAudioRef.current.currentTime = target;
    }
  }, []);

  /**
   * Seek to an absolute time.
   */
  const seekTo = useCallback((time: number) => {
    if (!currentAudioRef.current) return;
    const target = clamp(
      time,
      0,
      currentAudioRef.current.duration || Number.POSITIVE_INFINITY
    );
    if (Number.isFinite(target)) {
      currentAudioRef.current.currentTime = target;
    }
  }, []);

  /**
   * Set playback speed.
   */
  const setSpeed = useCallback((speed: number) => {
    const clamped = clamp(speed, 0.5, 2);
    speedRef.current = clamped;
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = clamped;
      if ("preservesPitch" in currentAudioRef.current) {
        currentAudioRef.current.preservesPitch = true;
      }
    }
    return clamped;
  }, []);

  /**
   * Get the abort signal for fetch operations.
   */
  const getAbortSignal = useCallback(() => {
    return abortControllerRef.current?.signal;
  }, []);

  /**
   * Check if playback was aborted.
   */
  const isAborted = useCallback(() => {
    return abortControllerRef.current?.signal.aborted ?? false;
  }, []);

  return {
    initializeAudio,
    appendBuffer,
    endStream,
    play,
    pause,
    resume,
    stop,
    seekBy,
    seekTo,
    setSpeed,
    cleanupAudio,
    getAbortSignal,
    isAborted,
    speedRef,
  };
}
