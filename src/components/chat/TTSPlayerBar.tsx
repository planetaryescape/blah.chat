"use client";

import { Loader2, Pause, Play, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTTSPlayer } from "@/contexts/TTSContext";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function TTSPlayerBar({ className }: { className?: string }) {
  const {
    state,
    pause,
    resume,
    stop: _stop,
    seekBy,
    seekTo,
    setSpeed,
    close,
  } = useTTSPlayer();
  const { isVisible, isLoading, isPlaying, duration, currentTime, speed } =
    state;

  const progressMax = useMemo(() => {
    if (duration && duration > 0) return duration;
    return Math.max(currentTime, 1);
  }, [duration, currentTime]);

  const handlePlayPause = useCallback(() => {
    if (isLoading) return;
    if (isPlaying) {
      pause();
    } else {
      void resume();
    }
  }, [isLoading, isPlaying, pause, resume]);

  const cycleSpeed = useCallback(
    (direction: "up" | "down") => {
      const currentIndex = SPEED_OPTIONS.indexOf(speed);
      let nextIndex;
      if (direction === "up") {
        nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
      } else {
        nextIndex =
          (currentIndex - 1 + SPEED_OPTIONS.length) % SPEED_OPTIONS.length;
      }
      setSpeed(SPEED_OPTIONS[nextIndex]);
    },
    [speed, setSpeed],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "escape":
          e.preventDefault();
          close();
          break;
        case "l":
          e.preventDefault();
          seekBy(15);
          break;
        case "h":
          e.preventDefault();
          seekBy(-15);
          break;
        case "k":
          e.preventDefault();
          cycleSpeed("up");
          break;
        case "j":
          e.preventDefault();
          cycleSpeed("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handlePlayPause, close, seekBy, cycleSpeed]);

  if (!isVisible && !isLoading) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-[76px] z-40 px-4",
        "flex justify-center", // Center alignment
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-lg flex-col gap-0 overflow-hidden",
          "rounded-2xl border border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl",
          "dark:border-white/10 dark:bg-black/60",
          "transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4",
        )}
      >
        {/* Header / Meta */}
        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2.5">
          <div className="flex items-center gap-3 overflow-hidden text-xs text-muted-foreground">
            <span>
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                Space
              </kbd>{" "}
              Play/Pause
            </span>
            <span>
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                K
              </kbd>
              /
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                J
              </kbd>{" "}
              Speed
            </span>
            <span>
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                H
              </kbd>
              /
              <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                L
              </kbd>{" "}
              ±15s
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
            onClick={close}
            title="Close (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Main Controls Area */}
        <div className="p-4">
          {/* Progress Bar */}
          <div className="mb-4 flex items-center gap-3">
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[Math.min(currentTime, progressMax)]}
              min={0}
              max={progressMax}
              step={0.1}
              onValueChange={([val]) => seekTo(val)}
              className="mt-0.5 flex-1 cursor-pointer"
              aria-label="Seek"
            />
            <span className="w-9 text-xs tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            {/* Speed Control (Cyclic) */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 min-w-[3rem] px-0 text-xs font-medium text-muted-foreground hover:text-foreground",
                "rounded-full bg-secondary/50 hover:bg-secondary",
              )}
              onClick={() => cycleSpeed("up")}
              title="Change Speed (J/K)"
            >
              {speed}x
            </Button>

            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                onClick={() => seekBy(-15)}
                disabled={isLoading}
                title="Rewind 15s (H)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95"
                onClick={handlePlayPause}
                disabled={isLoading}
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                onClick={() => seekBy(15)}
                disabled={isLoading}
                title="Forward 15s (L)"
              >
                <div className="relative">
                  <RotateCcw className="h-4 w-4 scale-x-[-1]" />
                </div>
              </Button>
            </div>

            {/* Placeholder for symmetry or other action like Stop which is implicit in close */}
            <div className="w-[3rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
