"use client";

import { Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTTSPlayer } from "@/contexts/TTSContext";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  messageId?: string;
  className?: string;
}

export function TTSButton({ text, messageId, className }: TTSButtonProps) {
  const { state, playFromText, pause, resume, seekTo } = useTTSPlayer();
  const isCurrent = state.sourceMessageId === messageId;
  const isLoading = state.isLoading && isCurrent;
  const isPlaying = state.isPlaying && isCurrent;

  const handlePlay = async () => {
    if (!text.trim()) return;

    // Toggle play/pause when clicking the same message
    if (isCurrent && !state.isLoading) {
      if (isPlaying) {
        pause();
        return;
      }

      // If we reached the end, restart from the beginning
      if (state.duration && state.currentTime >= state.duration - 0.25) {
        seekTo(0);
      }
      await resume();
      return;
    }

    await playFromText({ text, messageId });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handlePlay}
      disabled={isLoading || !text.trim()}
      className={cn(
        "h-6 w-6 p-0 text-muted-foreground/70 hover:bg-background/20 hover:text-foreground",
        className,
      )}
      title={isPlaying ? "Pause text-to-speech" : "Play with text-to-speech"}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
      <span className="sr-only">
        {isLoading ? "Generating..." : isPlaying ? "Stop" : "Play"}
      </span>
    </Button>
  );
}
