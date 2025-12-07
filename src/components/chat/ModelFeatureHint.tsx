"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getModelCapabilityHints } from "@/lib/ai/icons";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

interface ModelFeatureHintProps {
  modelId: string;
}

export function ModelFeatureHint({ modelId }: ModelFeatureHintProps) {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const hints = getModelCapabilityHints(modelId);
    if (hints.length === 0) return;

    // Check sessionStorage for each hint
    for (const hintText of hints) {
      const key = `modelHint-${hintText.split(" ")[0].toLowerCase()}`; // vision/extended/128k
      const shown = sessionStorage.getItem(key);

      if (!shown) {
        setHint(hintText);
        sessionStorage.setItem(key, "true");
        break; // Show only first new hint
      }
    }
  }, [modelId]);

  const dismiss = () => setHint(null);

  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 px-3 py-2 mb-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-100"
        >
          <span className="flex-1">{hint}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            className="h-4 w-4 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <X className="w-3 h-3" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
