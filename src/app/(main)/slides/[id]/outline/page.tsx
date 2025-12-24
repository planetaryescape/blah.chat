"use client";

export const dynamic = "force-dynamic";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { OutlineSidebar } from "@/components/slides/outline/OutlineSidebar";
import { OutlineSlideEditor } from "@/components/slides/outline/OutlineSlideEditor";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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
  const [selectedItemId, setSelectedItemId] =
    useState<Id<"outlineItems"> | null>(null);

  // Queries
  // @ts-ignore - Type depth exceeded
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded
  const rawItems = useQuery(api.outlineItems.list, { presentationId });

  // Local state for optimistic updates
  const [items, setItems] = useState<Doc<"outlineItems">[] | null>(null);

  // Sync items when loaded
  useEffect(() => {
    if (rawItems && !items) {
      setItems(rawItems);
      // Auto-select first item if nothing selected
      if (!selectedItemId && rawItems.length > 0) {
        setSelectedItemId(rawItems[0]._id);
      }
    } else if (rawItems && items) {
      // If external update (e.g. regeneration), verify if we should sync
      // For now, simple length check or deep compare could go here,
      // but simplistic sync is safer to avoid stale state after regen
      if (rawItems.length !== items.length) {
        setItems(rawItems);
      }
    }
  }, [rawItems, items, selectedItemId]);

  // @ts-ignore - Type depth exceeded
  const updateStatus = useMutation(api.presentations.updateStatus);
  // @ts-ignore - Type depth exceeded
  const approveOutline = useMutation(
    api.presentations.outline.approveOutlineFromItems,
  );
  // @ts-ignore - Type depth exceeded
  const updateFeedback = useMutation(api.outlineItems.updateFeedback);

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

  if (!presentation || !items) {
    return <FeatureLoadingScreen />;
  }

  const selectedItem = items.find((i) => i._id === selectedItemId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 transition-all duration-300 ease-in-out border-r z-20 bg-background",
          isSidebarOpen
            ? "w-80 translate-x-0"
            : "w-0 -translate-x-full opacity-0 pointer-events-none absolute md:relative",
        )}
      >
        <OutlineSidebar
          presentationId={presentationId}
          items={items}
          selectedItemId={selectedItemId}
          onSelect={handleSelect}
          onItemsReorder={handleItemsReorder}
        />
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
            <Button
              onClick={handleApprove}
              size="sm"
              className="h-8 shadow-sm gap-2"
            >
              Generate Slides <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative">
          {selectedItem ? (
            <OutlineSlideEditor
              item={selectedItem}
              index={items.findIndex((i) => i._id === selectedItemId)}
              onFeedbackChange={handleFeedbackChange}
            />
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
    </div>
  );
}
