"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {message ?? "Loading..."}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <AnimatePresence mode="wait">
        {status === "saving" && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </motion.div>
        )}
        {status === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-green-500"
          >
            <CheckCircle className="w-3 h-3" />
            <span>Saved</span>
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-destructive"
          >
            <span>Save failed</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ApplyingDiffIndicatorProps {
  isApplying: boolean;
  operationsCount?: number;
}

export function ApplyingDiffIndicator({
  isApplying,
  operationsCount,
}: ApplyingDiffIndicatorProps) {
  return (
    <AnimatePresence>
      {isApplying && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm flex items-center gap-2 shadow-lg"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Applying changes
            {operationsCount ? ` (${operationsCount} operations)` : ""}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
