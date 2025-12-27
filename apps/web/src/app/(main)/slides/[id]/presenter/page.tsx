"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Image from "next/image";
import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePresentationSync } from "@/hooks/usePresentationSync";

export default function PresenterPage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  const presentationId = unwrappedParams.id;

  // State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Queries
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const slides = useQuery(api.presentations.getSlides, { presentationId });

  // Sync with main presentation window
  const { sendSlideChange, sendTimerStart, sendTimerReset, sendExit } =
    usePresentationSync({
      presentationId,
      role: "presenter",
      onSlideChange: (index) => setCurrentSlideIndex(index),
    });

  // Navigation
  const nextSlide = useCallback(() => {
    if (!slides || currentSlideIndex >= slides.length - 1) return;
    const newIndex = currentSlideIndex + 1;
    setCurrentSlideIndex(newIndex);
    sendSlideChange(newIndex);
  }, [slides, currentSlideIndex, sendSlideChange]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex <= 0) return;
    const newIndex = currentSlideIndex - 1;
    setCurrentSlideIndex(newIndex);
    sendSlideChange(newIndex);
  }, [currentSlideIndex, sendSlideChange]);

  const jumpToSlide = useCallback(
    (index: number) => {
      if (!slides || index < 0 || index >= slides.length) return;
      setCurrentSlideIndex(index);
      sendSlideChange(index);
    },
    [slides, sendSlideChange],
  );

  // Timer
  const startTimer = useCallback(() => {
    setTimerStarted(true);
    setTimerStartTime(Date.now());
    sendTimerStart();
  }, [sendTimerStart]);

  const pauseTimer = useCallback(() => {
    setTimerStarted(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerStarted(false);
    setTimerStartTime(null);
    setElapsed(0);
    sendTimerReset();
  }, [sendTimerReset]);

  // Timer effect
  useEffect(() => {
    if (!timerStarted || !timerStartTime) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - timerStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, timerStartTime]);

  // Clock effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          nextSlide();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevSlide();
          break;
        case "Escape":
          e.preventDefault();
          window.close();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Exit handler
  const handleExit = () => {
    sendExit();
    window.close();
  };

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format current time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!presentation || !slides) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">
          Loading presenter view...
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const nextSlideData = slides[currentSlideIndex + 1];

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-sm truncate max-w-[300px]">
            {presentation.title}
          </h1>
          <span className="text-sm text-muted-foreground">Presenter View</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Timer controls */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg min-w-[80px]">
              {formatElapsed(elapsed)}
            </span>
            {!timerStarted ? (
              <Button variant="ghost" size="icon" onClick={startTimer}>
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={pauseTimer}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          {/* Current time */}
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)}
          </div>
          {/* Exit button */}
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current + Next slide */}
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* Current slide (larger) */}
          <div className="flex-[2] bg-black rounded-lg overflow-hidden relative">
            <SlideImage
              storageId={currentSlide?.imageStorageId}
              alt={currentSlide?.title || "Current slide"}
            />
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              Current: {currentSlideIndex + 1} / {slides.length}
            </div>
          </div>

          {/* Next slide (smaller) */}
          <div className="flex-1 bg-muted rounded-lg overflow-hidden relative">
            {nextSlideData ? (
              <>
                <SlideImage
                  storageId={nextSlideData.imageStorageId}
                  alt={nextSlideData.title || "Next slide"}
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Next: {currentSlideIndex + 2}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                End of presentation
              </div>
            )}
          </div>
        </div>

        {/* Right: Speaker notes */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-3 border-b">
            <h2 className="font-medium text-sm">Speaker Notes</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {currentSlide?.speakerNotes ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {currentSlide.speakerNotes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No speaker notes for this slide
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="border-t px-4 py-3 flex items-center justify-between shrink-0">
        <Button
          variant="outline"
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {slides.slice(0, 10).map((_, idx) => (
            <button
              key={slides[idx]._id}
              type="button"
              onClick={() => jumpToSlide(idx)}
              className={`w-8 h-6 text-xs rounded border transition-colors ${
                idx === currentSlideIndex
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {idx + 1}
            </button>
          ))}
          {slides.length > 10 && (
            <span className="text-sm text-muted-foreground">
              ...{slides.length}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          onClick={nextSlide}
          disabled={currentSlideIndex === slides.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </footer>
    </div>
  );
}

// Helper component for slide images
function SlideImage({
  storageId,
  alt,
}: {
  storageId?: Id<"_storage">;
  alt: string;
}) {
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const imageUrl = useQuery(
    api.storage.getUrl,
    storageId ? { storageId } : "skip",
  );

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}
