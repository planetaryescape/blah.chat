"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { analytics } from "@/lib/analytics";
import { useAction, useMutation } from "convex/react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentModelId: string;
  suggestedModelId: string;
  currentResponse: string;
  onSwitch: (modelId: string) => void;
  conversationId: Id<"conversations">;
  userMessage: string;
}

export function ModelPreviewModal({
  open,
  onOpenChange,
  currentModelId,
  suggestedModelId,
  currentResponse,
  onSwitch,
  conversationId,
  userMessage,
}: Props) {
  const [previewResponse, setPreviewResponse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [comparisonStartTime, setComparisonStartTime] = useState<number>(0);

  const currentModel = MODEL_CONFIG[currentModelId];
  const suggestedModel = MODEL_CONFIG[suggestedModelId];

  // Mutations
  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const dismissRecommendation = useMutation(
    api.conversations.dismissModelRecommendation,
  );
  const updatePreferences = useMutation(api.users.updatePreferences);

  // Scroll synchronization refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<"left" | "right" | null>(null);

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const generatePreview = useAction(api.ai.modelTriage.generatePreview);

  useEffect(() => {
    if (open) {
      setComparisonStartTime(Date.now());
      generatePreviewResponse();
    }
  }, [open]);

  // Synchronized scrolling logic
  useEffect(() => {
    const leftEl = leftScrollRef.current;
    const rightEl = rightScrollRef.current;

    if (!leftEl || !rightEl) return;

    const handleScrollLeft = () => {
      if (isScrolling.current === "right") return;
      isScrolling.current = "left";

      // Calculate percentage to handle different content heights
      const percentage =
        leftEl.scrollTop / (leftEl.scrollHeight - leftEl.clientHeight);
      // Determine the target scroll position for the right element
      // However, for direct comparison, pixel-for-pixel might be better if content is similar
      // But since models generate different lengths, percentage matching is safer for "end" alignment
      // Let's try direct pixel first, but often percentage feels more "connected" if lengths differ drastically.
      // Given the user wants to "compare", they likely want to read line by line.
      // If one text is much longer, percentage sync can make the shorter one scrol fast.
      // Let's stick to percentage as it ensures both reach bottom together.

      if (rightEl.scrollHeight > rightEl.clientHeight) {
        rightEl.scrollTop =
          percentage * (rightEl.scrollHeight - rightEl.clientHeight);
      }

      // Reset lock after a small delay to allow loop to break
      window.requestAnimationFrame(() => {
        if (isScrolling.current === "left") isScrolling.current = null;
      });
    };

    const handleScrollRight = () => {
      if (isScrolling.current === "left") return;
      isScrolling.current = "right";

      const percentage =
        rightEl.scrollTop / (rightEl.scrollHeight - rightEl.clientHeight);

      if (leftEl.scrollHeight > leftEl.clientHeight) {
        leftEl.scrollTop =
          percentage * (leftEl.scrollHeight - leftEl.clientHeight);
      }

      window.requestAnimationFrame(() => {
        if (isScrolling.current === "right") isScrolling.current = null;
      });
    };

    leftEl.addEventListener("scroll", handleScrollLeft);
    rightEl.addEventListener("scroll", handleScrollRight);

    return () => {
      leftEl.removeEventListener("scroll", handleScrollLeft);
      rightEl.removeEventListener("scroll", handleScrollRight);
    };
  }, [previewResponse, loading, open]); // Re-attach when content changes

  const generatePreviewResponse = async () => {
    setLoading(true);
    try {
      const result = await generatePreview({
        conversationId,
        suggestedModelId,
        userMessage,
      });
      setPreviewResponse(result.content);

      analytics.track("recommendation_preview_completed", {
        conversationId,
        currentModel: currentModelId,
        suggestedModel: suggestedModelId,
        generationTimeMs: Date.now() - comparisonStartTime,
        responseLength: result.content.length,
        timestamp: Date.now(),
      });

      analytics.track("recommendation_preview_compared", {
        conversationId,
        currentModel: currentModelId,
        suggestedModel: suggestedModelId,
        userSpentTimeComparingMs: Date.now() - comparisonStartTime,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to generate preview:", error);
      setPreviewResponse("Failed to generate preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async () => {
    if (!suggestedModel || !currentModel) return;

    // Calculate savings for analytics
    const savingsPercent = Math.round(
      (1 -
        (suggestedModel.pricing.input + suggestedModel.pricing.output) /
          (currentModel.pricing.input + currentModel.pricing.output)) *
        100,
    );

    analytics.track("recommendation_accepted", {
      conversationId,
      from: currentModelId,
      to: suggestedModelId,
      savings: savingsPercent,
      viaPreview: true,
      userSpentTimeComparingMs: Date.now() - comparisonStartTime,
      timestamp: Date.now(),
    });

    // 1. Switch the current conversation's model (Local)
    onSwitch(suggestedModelId);

    // 2. Dismiss the recommendation banner (Clean up)
    try {
      await dismissRecommendation({ conversationId });
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
    }

    // 3. Update global default model (Global) - Lock to "fixed" and set model
    try {
      console.log("[ModelPreviewModal] Updating preferences:", {
        newChatModelSelection: "fixed",
        defaultModel: suggestedModelId,
      });
      await updatePreferences({
        preferences: {
          newChatModelSelection: "fixed",
          defaultModel: suggestedModelId,
        },
      });
      console.log("[ModelPreviewModal] Preferences updated successfully");
      analytics.track("model_preference_updated", {
        event: "recommendation_switch",
        modelId: suggestedModelId,
      });
    } catch (err) {
      console.error(
        "[ModelPreviewModal] Failed to update global preference:",
        err,
      );
    }

    // 4. Refocus input for seamless continuation
    window.dispatchEvent(new CustomEvent("focus-chat-input"));

    onOpenChange(false);
  };

  // Helper to get savings percentage
  const savingsPercent = Math.round(
    (1 -
      (suggestedModel.pricing.input + suggestedModel.pricing.output) /
        (currentModel.pricing.input + currentModel.pricing.output)) *
      100,
  );

  if (!currentModel || !suggestedModel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[96vw] xl:max-w-[1600px] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-surface-glass-border bg-background/95 backdrop-blur-xl">
        <DialogHeader className="px-8 py-5 border-b shrink-0 flex flex-row items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Model Comparison
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1.5 font-normal">
                Review how the suggested model responds to your request
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-border overflow-hidden bg-muted/5 relative">
          {/* Current Model Column */}
          <div className="flex flex-col min-h-0 bg-background/50 h-full">
            <div className="p-4 px-6 border-b flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="font-semibold text-foreground flex items-center gap-3 text-lg">
                  {currentModel.name}
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono tracking-wider px-2 py-0.5 uppercase opacity-80"
                  >
                    Current
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col items-end text-xs gap-0.5">
                <span className="text-foreground font-mono font-medium text-sm">
                  $
                  {(
                    (currentModel.pricing.input + currentModel.pricing.output) /
                    2
                  ).toFixed(2)}{" "}
                  / 1M
                </span>
                <span className="text-muted-foreground/60">Estimated Cost</span>
              </div>
            </div>

            <div ref={leftScrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-none p-8 md:p-10">
                <MarkdownContent content={currentResponse} />
              </div>
            </div>
          </div>

          {/* Suggested Model Column */}
          <div className="flex flex-col min-h-0 bg-background h-full relative group">
            <div className="p-4 px-6 border-b flex items-center justify-between bg-blue-50/10 backdrop-blur supports-[backdrop-filter]:bg-blue-50/5 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="font-semibold text-foreground flex items-center gap-3 text-lg">
                  {suggestedModel.name}
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 border-green-500/20 text-[10px] font-mono tracking-wider px-2 py-0.5 uppercase">
                    {savingsPercent}% Cheaper
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col items-end text-xs gap-0.5">
                <span className="text-green-600 dark:text-green-400 font-mono font-medium text-sm">
                  $
                  {(
                    (suggestedModel.pricing.input +
                      suggestedModel.pricing.output) /
                    2
                  ).toFixed(2)}{" "}
                  / 1M
                </span>
                <span className="text-muted-foreground/60">Estimated Cost</span>
              </div>
            </div>

            <div
              ref={rightScrollRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/5 to-transparent"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 text-muted-foreground p-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                  <p className="text-sm font-medium animate-pulse tracking-wide">
                    Generating comparison response...
                  </p>
                </div>
              ) : (
                <div className="max-w-none p-8 md:p-10">
                  <MarkdownContent content={previewResponse} />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t p-6 bg-background/95 backdrop-blur shrink-0 flex flex-col xl:flex-row !justify-end gap-4 items-center z-20 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-4 w-full xl:w-auto justify-end">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitch}
              disabled={loading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex-1 xl:flex-none min-w-[200px] font-medium"
            >
              Switch to {suggestedModel.name}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
