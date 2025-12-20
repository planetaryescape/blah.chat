"use client";

import { DisabledFeaturePage } from "@/components/DisabledFeaturePage";
import { FeatureLoadingScreen } from "@/components/FeatureLoadingScreen";
import { OutlineActions } from "@/components/slides/outline/OutlineActions";
import { OutlineCardList } from "@/components/slides/outline/OutlineCardList";
import { OverallFeedbackSection } from "@/components/slides/outline/OverallFeedbackSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { usePaginatedQuery, useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { AlertTriangle, ArrowLeft, Loader2, Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function OutlineEditorPage({
  params,
}: {
  params: Promise<{ id: Id<"presentations"> }>;
}) {
  const unwrappedParams = use(params);
  const presentationId = unwrappedParams.id;
  const router = useRouter();
  const { showSlides, isLoading: prefsLoading } = useFeatureToggles();

  // Queries
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const outlineItems = useQuery(api.outlineItems.listByPresentation, {
    presentationId,
  });

  // Query messages to detect when initial outline is ready
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const { results: messages } = usePaginatedQuery(
    api.messages.listPaginated,
    presentation?.conversationId
      ? { conversationId: presentation.conversationId }
      : "skip",
    { initialNumItems: 10 },
  );

  // Query slides to detect post-generation mode
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const slides = useQuery(api.presentations.getSlides, { presentationId });

  // Mutations
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const submitFeedback = useMutation(api.presentations.submitOutlineFeedback);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const approveOutline = useMutation(api.presentations.approveOutlineFromItems);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateFeedback = useMutation(api.outlineItems.updateFeedback);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateImageModel = useMutation(api.presentations.updateImageModel);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const parseOutlineMessage = useMutation(
    api.presentations.parseOutlineMessage,
  );
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const regenerateSlides = useMutation(
    api.presentations.regenerateSlidesFromOutline,
  );
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const recreateOutline = useMutation(
    api.presentations.recreateOutlineFromSlides,
  );

  // Local state
  const [localItems, setLocalItems] = useState<Doc<"outlineItems">[] | null>(
    null,
  );
  const [overallFeedback, setOverallFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isRecreatingOutline, setIsRecreatingOutline] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState(
    "google:gemini-2.5-flash-image",
  );
  const hasAttemptedParse = useRef(false);
  const hasAttemptedRecreate = useRef(false);

  // Detect post-generation mode (slides already exist)
  const hasExistingSlides = slides && slides.length > 0;
  const isPostGeneration =
    hasExistingSlides ||
    presentation?.status === "slides_generating" ||
    presentation?.status === "slides_complete";

  // Detect when initial outline is ready but no outlineItems exist
  // This happens when user first arrives after AI generates the outline
  useEffect(() => {
    if (hasAttemptedParse.current) return;
    if (!messages || !outlineItems) return;
    if (outlineItems.length > 0) return; // Already have items
    if (isParsing) return;

    // Find complete assistant message
    const completeAssistant = messages.find(
      (m) => m.role === "assistant" && m.status === "complete",
    );

    if (!completeAssistant) return;

    // Parse and create outlineItems
    hasAttemptedParse.current = true;
    setIsParsing(true);

    parseOutlineMessage({
      presentationId,
      messageId: completeAssistant._id,
    })
      .then((result) => {
        // If parsing returned an error, allow retry after delay
        if (result?.error) {
          console.warn("Parse returned error, will allow retry:", result.error);
          setTimeout(() => {
            hasAttemptedParse.current = false;
          }, 3000);
        }
      })
      .catch((error) => {
        console.error("Failed to parse outline:", error);
        // Allow retry on error
        setTimeout(() => {
          hasAttemptedParse.current = false;
        }, 3000);
      })
      .finally(() => {
        setIsParsing(false);
      });
  }, [messages, outlineItems, presentationId, parseOutlineMessage, isParsing]);

  // Recreate outline from slides if in post-generation mode but no outline items
  // This handles legacy presentations where outline was deleted after approval
  useEffect(() => {
    if (hasAttemptedRecreate.current) return;
    if (!outlineItems || !slides) return;
    if (outlineItems.length > 0) return; // Already have outline items
    if (slides.length === 0) return; // No slides to recreate from
    if (isRecreatingOutline) return;

    // In post-generation mode with slides but no outline - recreate
    hasAttemptedRecreate.current = true;
    setIsRecreatingOutline(true);

    recreateOutline({ presentationId })
      .catch((error) => {
        console.error("Failed to recreate outline from slides:", error);
      })
      .finally(() => {
        setIsRecreatingOutline(false);
      });
  }, [
    outlineItems,
    slides,
    presentationId,
    recreateOutline,
    isRecreatingOutline,
  ]);

  // Sync server items to local state for optimistic reordering
  const items = useMemo(() => {
    if (localItems !== null) return localItems;
    return outlineItems ?? [];
  }, [localItems, outlineItems]);

  // Reset local items when server items change (after regeneration)
  useMemo(() => {
    if (outlineItems) {
      setLocalItems(null);
    }
  }, [outlineItems]);

  // Check if any items have feedback
  const hasFeedback = useMemo(() => {
    const hasItemFeedback = items.some((item) => item.feedback);
    const hasOverallFeedback = overallFeedback.trim().length > 0;
    return hasItemFeedback || hasOverallFeedback;
  }, [items, overallFeedback]);

  // Check if AI is still generating initial outline (no complete assistant message yet)
  const isInitialGenerating = useMemo(() => {
    if (!messages) return true; // Still loading
    const completeAssistant = messages.find(
      (m) => m.role === "assistant" && m.status === "complete",
    );
    return !completeAssistant;
  }, [messages]);

  // Check outline status
  const isGenerating =
    presentation?.outlineStatus === "regenerating" ||
    isParsing ||
    isInitialGenerating ||
    isRecreatingOutline;
  const slidesGenerating = presentation?.status === "slides_generating";
  const canApprove = items.length > 0 && !isGenerating && !slidesGenerating;
  const canRegenerate =
    items.length > 0 && !isGenerating && !slidesGenerating && !isRegenerating;

  // Handle feedback change on individual items
  const handleFeedbackChange = useCallback(
    async (itemId: Id<"outlineItems">, feedback: string) => {
      try {
        await updateFeedback({ outlineItemId: itemId, feedback });
      } catch (error) {
        console.error("Failed to update feedback:", error);
      }
    },
    [updateFeedback],
  );

  // Handle reorder (optimistic)
  const handleReorder = useCallback((newItems: Doc<"outlineItems">[]) => {
    setLocalItems(newItems);
  }, []);

  // Handle submit feedback
  const handleSubmitFeedback = async () => {
    if (!hasFeedback) return;

    setIsSubmitting(true);
    try {
      await submitFeedback({
        presentationId,
        overallFeedback: overallFeedback.trim() || undefined,
      });
      // Clear local overall feedback after submission
      setOverallFeedback("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!canApprove) return;

    setIsApproving(true);
    try {
      // Update image model first
      await updateImageModel({
        presentationId,
        imageModel: selectedImageModel,
      });

      // Then approve
      await approveOutline({ presentationId });

      // Redirect to preview
      router.push(`/slides/${presentationId}/preview`);
    } catch (error) {
      console.error("Failed to approve outline:", error);
      setIsApproving(false);
    }
  };

  // Handle regenerate slides (deletes existing slides and recreates from outline)
  const handleRegenerateSlides = async () => {
    if (!canRegenerate) return;

    setIsRegenerating(true);
    try {
      // Update image model first
      await updateImageModel({
        presentationId,
        imageModel: selectedImageModel,
      });

      // Regenerate slides (deletes existing + triggers new generation)
      await regenerateSlides({ presentationId });

      // Redirect to preview to watch generation
      router.push(`/slides/${presentationId}/preview`);
    } catch (error) {
      console.error("Failed to regenerate slides:", error);
      setIsRegenerating(false);
    }
  };

  // Show loading while preferences are being fetched
  if (prefsLoading) {
    return <FeatureLoadingScreen />;
  }

  // Feature toggle check
  if (!showSlides) {
    return <DisabledFeaturePage featureName="Slides" settingKey="showSlides" />;
  }

  // Loading state
  if (!presentation) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/slides")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">{presentation.title}</h1>
          </div>
        </div>

        <OutlineActions
          hasFeedback={hasFeedback}
          isSubmitting={isSubmitting}
          isApproving={isApproving}
          isGenerating={isGenerating}
          canApprove={canApprove}
          onSubmitFeedback={handleSubmitFeedback}
          onApprove={handleApprove}
          isPostGeneration={isPostGeneration}
          isRegenerating={isRegenerating}
          canRegenerate={canRegenerate}
          onRegenerateSlides={handleRegenerateSlides}
        />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Cards Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Overall Feedback */}
            <OverallFeedbackSection
              value={overallFeedback}
              onChange={setOverallFeedback}
              disabled={isGenerating || isSubmitting}
            />

            {/* Post-generation Warning Banner */}
            {isPostGeneration && !isGenerating && !slidesGenerating && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    Editing generated slides
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Changes to the outline require regenerating all slides. This
                    will delete existing slides and images.
                  </p>
                </div>
              </div>
            )}

            {/* Status Banner */}
            {isGenerating && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                <div>
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Regenerating outline...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your feedback is being applied. This may take a moment.
                  </p>
                </div>
              </div>
            )}

            {/* Outline Cards */}
            <OutlineCardList
              presentationId={presentationId}
              items={items}
              onItemsReorder={handleReorder}
              onFeedbackChange={handleFeedbackChange}
              isLoading={outlineItems === undefined}
            />
          </div>
        </ScrollArea>

        {/* Sidebar */}
        <div className="hidden w-80 flex-col border-l bg-muted/30 lg:flex">
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold mb-2">Outline Editor</h2>
                <p className="text-sm text-muted-foreground">
                  Review your presentation outline. Add feedback to any slide or
                  provide overall suggestions.
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">How it works</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      1.
                    </span>
                    Review the generated outline cards
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      2.
                    </span>
                    Add feedback to specific slides or overall
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      3.
                    </span>
                    Submit feedback to regenerate
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-foreground shrink-0">
                      4.
                    </span>
                    Approve when satisfied to generate slides
                  </li>
                </ol>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Feedback tips</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• "Make this slide more concise"</li>
                  <li>• "Add more details about X"</li>
                  <li>• "Combine with the next slide"</li>
                  <li>• "Add a slide about Y here"</li>
                </ul>
              </div>

              {/* Stats */}
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total slides</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">With feedback</span>
                  <span className="font-medium">
                    {items.filter((i) => i.feedback).length}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Model selector + Actions */}
          <div className="space-y-4 border-t p-4">
            <div className="space-y-2">
              <Label htmlFor="image-model">Image Generation Model</Label>
              <Select
                value={selectedImageModel}
                onValueChange={setSelectedImageModel}
              >
                <SelectTrigger id="image-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google:gemini-2.5-flash-image">
                    Gemini 2.5 Flash (Recommended)
                  </SelectItem>
                  <SelectItem value="google:gemini-3-pro-image-preview">
                    Gemini 3 Pro (Premium)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedImageModel === "google:gemini-2.5-flash-image"
                  ? "Fast & cost-effective"
                  : "Advanced reasoning, highest quality"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
