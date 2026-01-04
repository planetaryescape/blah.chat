"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Lightbulb, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  // Early returns before hooks - pure prop/import checks
  if (recommendation.dismissed) return null;
  const suggestedModel = MODEL_CONFIG[recommendation.suggestedModelId];
  if (!suggestedModel) return null;

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
        className="mx-auto mb-3 max-w-3xl rounded-lg border border-border/50 bg-card px-4 py-3 shadow-sm"
      >
        <div className="space-y-2">
          {/* Header: Model names + dismiss */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium">
                Try {suggestedModel.name}
              </span>
              <span className="text-xs font-medium text-green-500">
                {recommendation.estimatedSavings.percentSaved}% cheaper
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Reasoning - educational text */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.reasoning}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Compare
            </Button>
            <Button size="sm" onClick={handleSwitch} className="h-7 text-xs">
              Switch to {suggestedModel.name}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
