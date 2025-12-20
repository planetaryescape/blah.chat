"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { DownloadButton } from "@/components/slides/DownloadButton";
import { PresentationMode } from "@/components/slides/PresentationMode";
import { PresentationStats } from "@/components/slides/PresentationStats";
import { SlideDetails } from "@/components/slides/SlideDetails";
import { SlideLightbox } from "@/components/slides/SlideLightbox";
import { SlidePreview } from "@/components/slides/SlidePreview";
import { SlideThumbnail } from "@/components/slides/SlideThumbnail";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useQuery } from "convex/react";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileEdit,
    Loader2,
    Palette,
    Play,
    Presentation,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  const presentationId = unwrappedParams.id;
  const router = useRouter();
  const { showSlides, isLoading: prefsLoading } = useFeatureToggles();
  const { isMobile } = useMobileDetect();

  // State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [presentMode, setPresentMode] = useState(false);

  // Queries
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const slides = useQuery(api.presentations.getSlides, { presentationId });

  // Navigation functions
  const nextSlide = useCallback(() => {
    if (!slides) return;
    setDirection(1);
    setCurrentSlideIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlideIndex((i) => Math.max(i - 1, 0));
  }, []);

  const jumpToSlide = useCallback(
    (index: number) => {
      if (!slides || index < 0 || index >= slides.length) return;
      setDirection(index > currentSlideIndex ? 1 : -1);
      setCurrentSlideIndex(index);
    },
    [slides, currentSlideIndex],
  );

  // Start presentation with native fullscreen
  const handlePresent = useCallback(() => {
    // Request fullscreen FIRST - must be synchronous from user gesture
    document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .then(() => {
        // Delay render until after fullscreen transition completes
        // This prevents DOM changes from aborting the fullscreen request
        requestAnimationFrame(() => {
          setPresentMode(true);
        });
      })
      .catch((e) => {
        console.error("Fullscreen failed:", e);
        // Still show presentation mode even if fullscreen fails (e.g., iOS Safari)
        setPresentMode(true);
      });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!slides || zoomOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          nextSlide();
          break;
        case "ArrowLeft":
          prevSlide();
          break;
        default:
          // Number keys 1-9
          if (e.key >= "1" && e.key <= "9") {
            const idx = Number.parseInt(e.key) - 1;
            jumpToSlide(idx);
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides, zoomOpen, nextSlide, prevSlide, jumpToSlide]);

  // Show loading while preferences are being fetched
  if (prefsLoading) {
    return <FeatureLoadingScreen />;
  }

  // Feature toggle check
  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  // Loading state
  if (!presentation || !slides) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const progress =
    presentation.totalSlides > 0
      ? (presentation.generatedSlideCount / presentation.totalSlides) * 100
      : 0;
  const isGenerating = presentation.status === "slides_generating";
  const isComplete = presentation.status === "slides_complete";

  // Status text and icon
  const getStatusText = () => {
    switch (presentation.status) {
      case "outline_complete":
        return "Design pending";
      case "design_generating":
        return "Generating design...";
      case "design_complete":
        return "Design ready";
      case "slides_generating":
        return `Generating ${presentation.generatedSlideCount}/${presentation.totalSlides}`;
      case "slides_complete":
        return "Complete";
      case "error":
        return "Error";
      default:
        return presentation.status;
    }
  };

  const getStatusIcon = (className: string) => {
    switch (presentation.status) {
      case "outline_complete":
        return <Clock className={className} />;
      case "design_generating":
        return <Palette className={`${className} animate-pulse`} />;
      case "design_complete":
        return <Palette className={className} />;
      case "slides_generating":
        return <Loader2 className={`${className} animate-spin`} />;
      case "slides_complete":
        return <CheckCircle className={`${className} text-green-500`} />;
      case "error":
        return <AlertCircle className={`${className} text-destructive`} />;
      default:
        return <Clock className={className} />;
    }
  };

  // Format model name for display
  const getModelDisplayName = () => {
    const model = presentation.imageModel || "google:gemini-3-pro-image-preview";
    if (model.includes("gemini-3")) return "Gemini 3";
    if (model.includes("gemini-2.5") || model.includes("gemini-2-5")) return "Gemini 2.5";
    if (model.includes("gemini-2")) return "Gemini 2";
    // Fallback: extract model name
    return model.replace(/^google:/, "").replace(/-/g, " ");
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh]">
        {/* Header */}
        <header className="border-b p-3 flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/slides")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Presentation className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium truncate flex-1">
            {presentation.title}
          </span>
          <PresentationStats slides={slides} modelName={getModelDisplayName()} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="shrink-0">
                {getStatusIcon("h-4 w-4")}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{getStatusText()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isComplete && (
            <Button
              size="icon"
              className="shrink-0"
              onClick={handlePresent}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </header>

        {/* Progress bar */}
        {isGenerating && (
          <div className="px-3 py-2 border-b shrink-0">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Main preview */}
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 overflow-hidden">
          {currentSlide && (
            <SlidePreview
              slide={currentSlide}
              direction={direction}
              onZoom={() => setZoomOpen(true)}
            />
          )}
        </div>

        {/* Bottom navigation */}
        <div className="border-t p-3 flex items-center justify-between shrink-0 bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Lightbox */}
        <SlideLightbox
          open={zoomOpen}
          onClose={() => setZoomOpen(false)}
          slide={currentSlide}
        />
      </div>
    );
  }

  // Desktop layout - Three panels
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/slides")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">{presentation.title}</h1>
          </div>
          {isGenerating && (
            <span className="text-sm text-muted-foreground">
              Generating {presentation.generatedSlideCount}/
              {presentation.totalSlides} slides...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <PresentationStats slides={slides} modelName={getModelDisplayName()} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {getStatusIcon("h-4 w-4")}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{getStatusText()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/slides/${presentationId}/outline`)}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Edit Outline
          </Button>
          <DownloadButton presentationId={presentationId} />
          <Button
            size="sm"
            onClick={handlePresent}
            disabled={!isComplete}
          >
            <Play className="h-4 w-4 mr-2" />
            Present
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      {isGenerating && (
        <div className="px-4 py-2 border-b shrink-0">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Thumbnail sidebar */}
        <aside className="w-72 shrink-0 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {slides.map((slide, index) => (
                <SlideThumbnail
                  key={slide._id}
                  slide={slide}
                  index={index}
                  isActive={index === currentSlideIndex}
                  onClick={() => jumpToSlide(index)}
                />
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* CENTER: Main preview */}
        <main className="flex-1 flex items-center justify-center bg-muted/20 p-8 overflow-hidden">
          {currentSlide && (
            <SlidePreview
              slide={currentSlide}
              direction={direction}
              onZoom={() => setZoomOpen(true)}
            />
          )}
        </main>

        {/* RIGHT: Details panel */}
        <aside className="w-80 shrink-0 border-l bg-background">
          <ScrollArea className="h-full">
            {currentSlide && (
              <SlideDetails
                slide={currentSlide}
                slideNumber={currentSlideIndex + 1}
                totalSlides={slides.length}
              />
            )}
          </ScrollArea>
        </aside>
      </div>

      {/* Lightbox */}
      <SlideLightbox
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        slide={currentSlide}
      />

      {/* Presentation Mode */}
      {presentMode && (
        <PresentationMode
          slides={slides}
          initialSlideIndex={currentSlideIndex}
          onExit={() => setPresentMode(false)}
          presentationId={presentationId}
        />
      )}
    </div>
  );
}
