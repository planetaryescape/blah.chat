"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { analytics } from "@/lib/analytics";

interface Props {
  modelId: string;
  modelName: string;
  onSetDefault: () => void;
  onDismiss: () => void;
  conversationId: Id<"conversations">;
}

export function SetDefaultModelPrompt({
  modelId,
  modelName,
  onSetDefault,
  onDismiss,
  conversationId,
}: Props) {
  useEffect(() => {
    analytics.track("set_default_prompt_shown", {
      conversationId,
      modelId,
      afterAcceptingRecommendation: true,
      timestamp: Date.now(),
    });
  }, [conversationId, modelId]);

  const handleSetDefault = () => {
    analytics.track("set_default_accepted", {
      conversationId,
      modelId,
      timestamp: Date.now(),
    });
    onSetDefault();
  };

  const handleDismiss = () => {
    analytics.track("set_default_dismissed", {
      conversationId,
      modelId,
      timestamp: Date.now(),
    });
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto mb-4 max-w-3xl rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-green-500/20 p-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-green-200">
              {modelName} worked great! 💚
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Make it your default model for future chats?
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Button
              size="sm"
              onClick={handleSetDefault}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Set as default
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
