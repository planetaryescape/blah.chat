"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTTSPlayer } from "@/contexts/TTSContext";
import { cn } from "@/lib/utils";
import {
    Loader2,
    Pause,
    Play,
    RotateCcw,
    RotateCw,
    Square,
    X
} from "lucide-react";
import { useMemo } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;

export function TTSPlayerBar({ className }: { className?: string }) {
  const { state, pause, resume, stop, seekBy, seekTo, setSpeed, close } =
    useTTSPlayer();
  const { isVisible, isLoading, isPlaying, duration, currentTime, speed } =
    state;

  const progressMax = useMemo(() => {
    if (duration && duration > 0) return duration;
    return Math.max(currentTime, 1);
  }, [duration, currentTime]);

  const progressPercent = useMemo(() => {
    if (progressMax <= 0) return 0;
    return Math.min((currentTime / progressMax) * 100, 100);
  }, [currentTime, progressMax]);

  if (!isVisible && !isLoading) return null;

  const handlePlayPause = () => {
    if (isLoading) return;
    if (isPlaying) {
      pause();
    } else {
      void resume();
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 top-[57px] z-40 px-3 sm:px-4",
        className,
      )}
    >
      {/* Modern floating player with glassmorphism */}
      <div className="pointer-events-auto mx-auto max-w-3xl animate-in slide-in-from-top-2 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/80 shadow-xl backdrop-blur-xl">
          {/* Gradient accent line */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          {/* Progress bar background (subtle) */}
          <div className="absolute inset-x-0 top-0.5 h-full bg-primary/5" style={{ width: `${progressPercent}%` }} />

          <div className="relative p-3">
            {/* Main controls row */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={close}
                title="Close player"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>

              {/* Skip back 15s */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 rounded-full px-2 text-muted-foreground hover:text-foreground"
                onClick={() => seekBy(-15)}
                disabled={isLoading}
                title="Skip back 15 seconds"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">15</span>
              </Button>

              {/* Play/Pause - Primary action */}
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full shadow-md"
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
                <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
              </Button>

              {/* Skip forward 15s */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 rounded-full px-2 text-muted-foreground hover:text-foreground"
                onClick={() => seekBy(15)}
                disabled={isLoading}
                title="Skip forward 15 seconds"
              >
                <span className="text-xs font-medium">15</span>
                <RotateCw className="h-3.5 w-3.5" />
              </Button>

              {/* Progress section */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-xs font-medium tabular-nums text-muted-foreground w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[Math.min(currentTime, progressMax)]}
                  min={0}
                  max={progressMax}
                  step={0.1}
                  onValueChange={([val]) => seekTo(val)}
                  className="flex-1"
                  aria-label="Playback position"
                />
                <span className="text-xs font-medium tabular-nums text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Speed selector */}
              <div className="hidden sm:flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
                {SPEED_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 rounded-full px-2 text-xs font-medium transition-all",
                      option === speed
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSpeed(option)}
                    disabled={isLoading}
                  >
                    {option}x
                  </Button>
                ))}
              </div>

              {/* Mobile speed indicator */}
              <div className="flex sm:hidden items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-2 text-xs font-medium"
                  onClick={() => {
                    const currentIdx = SPEED_OPTIONS.indexOf(speed as typeof SPEED_OPTIONS[number]);
                    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
                    setSpeed(SPEED_OPTIONS[nextIdx]);
                  }}
                  disabled={isLoading}
                >
                  {speed}x
                </Button>
              </div>

              {/* Stop button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={stop}
                disabled={isLoading}
                title="Stop playback"
              >
                <Square className="h-3.5 w-3.5" />
                <span className="sr-only">Stop</span>
              </Button>
            </div>

            {/* Preview text (optional - shows what's being read) */}
            {state.previewText && (
              <div className="mt-2 px-1">
                <p className="text-xs text-muted-foreground/70 truncate italic">
                  "{state.previewText}..."
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
