"use client";

export const dynamic = "force-dynamic";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { OutlineLoadingSkeleton } from "@/components/slides/outline/OutlineLoadingSkeleton";
import { OutlineSidebar } from "@/components/slides/outline/OutlineSidebar";
import { OutlineSlideEditor } from "@/components/slides/outline/OutlineSlideEditor";
import { OverallFeedbackSection } from "@/components/slides/outline/OverallFeedbackSection";
import { VisualInfoPanel } from "@/components/slides/outline/VisualInfoPanel";
import { Button } from "@/components/ui/button";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { cn } from "@/lib/utils";

export default function SlideOutlinePage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  return <SlideOutlineContent presentationId={unwrappedParams.id} />;
}

function SlideOutlineContent({
  presentationId,
}: {
  presentationId: Id<"presentations">;
}) {
  const router = useRouter();
  const { showSlides, isLoading: prefsLoading } = useFeatureToggles();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVisualPanelOpen, setIsVisualPanelOpen] = useState(true);
  const [selectedItemId, setSelectedItemId] =
    useState<Id<"outlineItems"> | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Queries
  // @ts-ignore - Type depth exceeded
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded
  const rawItems = useQuery(api.outlineItems.list, { presentationId });

  // Local state for optimistic updates
  const [items, setItems] = useState<Doc<"outlineItems">[] | null>(null);

  // Sync items when loaded (support streaming updates)
  useEffect(() => {
    if (rawItems) {
      // Always sync to get latest items (supports streaming)
      setItems(rawItems);
      // Auto-select first item if nothing selected and items exist
      if (!selectedItemId && rawItems.length > 0) {
        setSelectedItemId(rawItems[0]._id);
      }
    }
  }, [rawItems, selectedItemId]);

  // @ts-ignore - Type depth exceeded
  const updateStatus = useMutation(api.presentations.updateStatus);
  // @ts-ignore - Type depth exceeded
  const approveOutline = useMutation(
    api.presentations.outline.approveOutlineFromItems,
  );
  // @ts-ignore - Type depth exceeded
  const submitFeedback = useMutation(
    api.presentations.outline.submitOutlineFeedback,
  );
  // @ts-ignore - Type depth exceeded
  const updateFeedback = useMutation(api.outlineItems.updateFeedback);
  // @ts-ignore - Type depth exceeded
  const updateOverallFeedback = useMutation(
    api.presentations.updateOverallFeedback,
  );

  // Overall feedback state
  const [localOverallFeedback, setLocalOverallFeedback] = useState(
    presentation?.overallFeedback || "",
  );

  // Sync overall feedback when presentation loads
  useEffect(() => {
    if (presentation?.overallFeedback !== undefined) {
      setLocalOverallFeedback(presentation.overallFeedback || "");
    }
  }, [presentation?.overallFeedback]);

  // Reset regenerating state when outline regeneration completes
  useEffect(() => {
    if (
      presentation?.outlineStatus === "ready" ||
      presentation?.outlineStatus === undefined
    ) {
      setIsRegenerating(false);
    }
  }, [presentation?.outlineStatus]);

  const handleOverallFeedbackChange = (value: string) => {
    setLocalOverallFeedback(value);
    // Debounce would be nice here, but for simplicity just save on change
    updateOverallFeedback({ presentationId, feedback: value });
  };

  // Check if any feedback exists
  const hasFeedback =
    localOverallFeedback.trim() !== "" ||
    (items?.some((item) => item.feedback?.trim()) ?? false);

  const handleSubmitFeedback = async () => {
    if (!hasFeedback || isRegenerating) return;

    setIsRegenerating(true);
    try {
      await submitFeedback({
        presentationId,
        overallFeedback: localOverallFeedback,
      });
      toast.success("Regenerating outline with your feedback...");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit feedback");
      setIsRegenerating(false);
    }
  };

  // Select Item Handler
  const handleSelect = (id: Id<"outlineItems">) => {
    setSelectedItemId(id);
    // On mobile, maybe close sidebar?
  };

  const handleFeedbackChange = (
    itemId: Id<"outlineItems">,
    feedback: string,
  ) => {
    updateFeedback({ outlineItemId: itemId, feedback });

    // Update local state
    if (items) {
      setItems((prev) =>
        prev
          ? prev.map((item) =>
              item._id === itemId ? { ...item, feedback } : item,
            )
          : [],
      );
    }
  };

  const handleItemsReorder = (newItems: Doc<"outlineItems">[]) => {
    setItems(newItems);
  };

  const handleApprove = async () => {
    if (!presentation || !items) return;

    try {
      await updateStatus({ presentationId, status: "slides_generating" });
      router.push(`/slides/${presentationId}/preview`); // Redirect to preview/generating page
      await approveOutline({ presentationId });
    } catch (e) {
      toast.error("Failed to approve outline");
      console.error(e);
      await updateStatus({ presentationId, status: "outline_complete" });
    }
  };

  // Feature toggle check
  if (prefsLoading) return <FeatureLoadingScreen />;
  if (!showSlides)
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;

  if (!presentation) {
    return <FeatureLoadingScreen />;
  }

  // Determine if we're in a generating state
  const isOutlineGenerating =
    presentation.status === "outline_pending" ||
    presentation.status === "outline_generating";
  const isDesignGenerating = presentation.status === "design_generating";
  const isGenerating = isOutlineGenerating || isDesignGenerating;

  // Show full skeleton only if outline_pending with no items yet
  // Once items start streaming in, show the main layout
  if (
    presentation.status === "outline_pending" &&
    (!items || items.length === 0)
  ) {
    return (
      <OutlineLoadingSkeleton
        aspectRatio={presentation.aspectRatio || "16:9"}
      />
    );
  }

  // Use empty array as fallback during streaming
  const displayItems = items || [];

  if (presentation.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-background">
        <p className="text-destructive font-medium mb-2">Generation Failed</p>
        <p className="text-muted-foreground">
          Please try creating the presentation again.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/slides/new")}
        >
          Back to Create
        </Button>
      </div>
    );
  }

  const selectedItem = displayItems.find((i) => i._id === selectedItemId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 transition-all duration-300 ease-in-out border-r z-20 bg-background flex flex-col",
          isSidebarOpen
            ? "w-80 translate-x-0"
            : "w-0 -translate-x-full opacity-0 pointer-events-none absolute md:relative",
        )}
      >
        {/* Overall Feedback - hide during generation */}
        {!isOutlineGenerating && (
          <div className="p-3 border-b">
            <OverallFeedbackSection
              value={localOverallFeedback}
              onChange={handleOverallFeedbackChange}
            />
          </div>
        )}
        {/* Generating indicator */}
        {isOutlineGenerating && (
          <div className="p-3 border-b bg-primary/5">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating outline...</span>
            </div>
          </div>
        )}
        {/* Slide List */}
        <div className="flex-1 overflow-hidden">
          <OutlineSidebar
            presentationId={presentationId}
            items={displayItems}
            selectedItemId={selectedItemId}
            onSelect={handleSelect}
            onItemsReorder={handleItemsReorder}
            isGenerating={isOutlineGenerating}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-secondary/5 relative">
        {/* Toolbar / Header for Main Area */}
        <header className="flex-shrink-0 h-14 border-b bg-background flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-8 w-8"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <span className="font-semibold text-sm hidden sm:inline-block ml-2">
              {presentation.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hide action buttons during generation (outline or design) */}
            {!isOutlineGenerating && !isDesignGenerating && (
              <>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={!hasFeedback || isRegenerating || isGenerating}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Apply Feedback
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isGenerating || displayItems.length === 0}
                  size="sm"
                  className="h-8 shadow-sm gap-2"
                >
                  Generate Slides <ArrowRight className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative">
          {selectedItem ? (
            <OutlineSlideEditor
              item={selectedItem}
              index={displayItems.findIndex((i) => i._id === selectedItemId)}
              onFeedbackChange={handleFeedbackChange}
              aspectRatio={presentation.aspectRatio || "16:9"}
            />
          ) : isOutlineGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
              <p className="font-medium">Generating your first slide...</p>
              <p className="text-sm mt-1">
                Slides will appear as they're created
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <Sparkles className="h-12 w-12 mb-4 text-muted-foreground/20" />
              <p className="font-medium">Select a slide to edit</p>
              <p className="text-sm mt-1">
                Or drag to reorder slides in the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Info Panel */}
      <VisualInfoPanel
        designSystem={presentation.designSystem}
        visualDirection={selectedItem?.visualDirection}
        isOpen={isVisualPanelOpen}
        onToggle={() => setIsVisualPanelOpen(!isVisualPanelOpen)}
        isDesignGenerating={isDesignGenerating}
        isOutlineGenerating={isOutlineGenerating}
      />
    </div>
  );
}
