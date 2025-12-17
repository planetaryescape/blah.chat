"use client";

import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Lightbulb, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { analytics } from "@/lib/analytics";

interface Props {
  recommendation: NonNullable<Doc<"conversations">["modelRecommendation"]>;
  conversationId: Id<"conversations">;
  onSwitch: (modelId: string) => void;
  onPreview: (modelId: string) => void;
}

export function ModelRecommendationBanner({
  recommendation,
  conversationId,
  onSwitch,
  onPreview,
}: Props) {
  const dismiss = useMutation(api.conversations.dismissModelRecommendation);
  const updatePreferences = useMutation(api.users.updatePreferences);

  // Track when banner shows
  useEffect(() => {
    analytics.track("recommendation_shown", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      percentSaved: recommendation.estimatedSavings.percentSaved,
      timestamp: Date.now(),
    });
  }, [conversationId, recommendation]);

  if (recommendation.dismissed) return null;

  const suggestedModel = MODEL_CONFIG[recommendation.suggestedModelId];
  if (!suggestedModel) return null;

  const handleDismiss = () => {
    analytics.track("recommendation_dismissed", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      secondsVisible: (Date.now() - recommendation.createdAt) / 1000,
      timestamp: Date.now(),
    });
    dismiss({ conversationId });
  };

  const handleSwitch = async () => {
    analytics.track("recommendation_accepted", {
      conversationId,
      from: recommendation.currentModelId,
      to: recommendation.suggestedModelId,
      savings: recommendation.estimatedSavings.percentSaved,
      viaPreview: false,
      timestamp: Date.now(),
    });

    // 1. Switch the local conversation model
    onSwitch(recommendation.suggestedModelId);

    // 2. Dismiss the banner
    dismiss({ conversationId });

    // 3. Update global settings (same as modal)
    try {
      await updatePreferences({
        preferences: {
          newChatModelSelection: "fixed",
          defaultModel: recommendation.suggestedModelId,
        },
      });
    } catch (err) {
      console.error(
        "[ModelRecommendationBanner] Failed to update global preference:",
        err,
      );
    }

    // 4. Refocus input for seamless continuation
    window.dispatchEvent(new CustomEvent("focus-chat-input"));
  };

  const handlePreview = () => {
    analytics.track("recommendation_preview_clicked", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      timestamp: Date.now(),
    });
    onPreview(recommendation.suggestedModelId);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto mb-4 max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Lightbulb className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold">Model Recommendation</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-base leading-relaxed">
              {recommendation.reasoning}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {recommendation.estimatedSavings.costReduction}
              </p>
              <span className="text-xs font-semibold text-green-500">
                {recommendation.estimatedSavings.percentSaved}% less
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex-1 justify-center border-border/60 hover:border-border"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Comparison
            </Button>
            <Button
              onClick={handleSwitch}
              className="flex-1 justify-center bg-primary/90 hover:bg-primary text-primary-foreground"
            >
              Switch to {suggestedModel.name}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
