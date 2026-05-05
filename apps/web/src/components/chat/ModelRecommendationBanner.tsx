"use client";

import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { AnimatePresence, m } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { useSDKClient } from "@/lib/api/sdkClient";

interface ModelRecommendation {
  suggestedModelId: string;
  currentModelId: string;
  estimatedSavings: { percentSaved: number };
  reasoning: string;
  dismissed: boolean;
  createdAt: number;
}

interface Props {
  recommendation: ModelRecommendation;
  conversationId: string;
  onSwitch: (modelId: string) => void;
  /** Optional: open ModelPreviewModal for the suggested model. */
  onPreview?: (modelId: string) => void;
}

export function ModelRecommendationBanner({
  recommendation,
  conversationId,
  onSwitch,
  onPreview,
}: Props) {
  const apiClient = useApiClient();
  const sdk = useSDKClient();
  const suggestedModel = MODEL_CONFIG[recommendation.suggestedModelId];

  // Track when banner shows (only if visible)
  useEffect(() => {
    if (recommendation.dismissed || !suggestedModel) return;
    analytics.track("recommendation_shown", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      percentSaved: recommendation.estimatedSavings.percentSaved,
      timestamp: Date.now(),
    });
  }, [conversationId, recommendation, suggestedModel]);

  // Early returns after all hooks
  if (recommendation.dismissed) return null;
  if (!suggestedModel) return null;

  const dismissRecommendation = () =>
    apiClient.post(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/model-recommendation/dismiss`,
      {},
    );

  const handleDismiss = () => {
    analytics.track("recommendation_dismissed", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      secondsVisible: (Date.now() - recommendation.createdAt) / 1000,
      timestamp: Date.now(),
    });
    dismissRecommendation();
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
    dismissRecommendation();

    // 3. Update global settings (same as modal)
    try {
      await sdk.updatePreference("newChatModelSelection", "fixed");
      await sdk.updatePreference(
        "defaultModel",
        recommendation.suggestedModelId,
      );
    } catch (err) {
      console.error(
        "[ModelRecommendationBanner] Failed to update global preference:",
        err,
      );
    }

    // 4. Refocus input for seamless continuation
    window.dispatchEvent(new CustomEvent("focus-chat-input"));
  };

  const handleDisableRecommendations = async () => {
    analytics.track("recommendation_disabled_globally", {
      conversationId,
      currentModel: recommendation.currentModelId,
      suggestedModel: recommendation.suggestedModelId,
      timestamp: Date.now(),
    });

    try {
      await sdk.updatePreference("enableModelRecommendations", false);
      dismissRecommendation();
    } catch (err) {
      console.error(
        "[ModelRecommendationBanner] Failed to disable recommendations:",
        err,
      );
    }
  };

  return (
    <AnimatePresence>
      <m.div
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
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSwitch} className="h-7 text-xs">
                Switch to {suggestedModel.name}
              </Button>
              {onPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(recommendation.suggestedModelId)}
                  className="h-7 text-xs"
                >
                  Preview
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisableRecommendations}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Don't show again
            </Button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
