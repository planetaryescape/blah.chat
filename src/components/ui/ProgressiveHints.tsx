"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

interface ProgressiveHint {
  id: string;
  icon: ReactNode;
  message: string;
  threshold: number;
  type: "message" | "conversation";
}

const HINTS: ProgressiveHint[] = [
  {
    id: "keyboard-shortcuts",
    icon: <Lightbulb className="w-4 h-4 text-primary" />,
    message: "Press ⌘K for keyboard shortcuts",
    threshold: 3,
    type: "message",
  },
  {
    id: "comparison-mode",
    icon: <Lightbulb className="w-4 h-4 text-primary" />,
    message: "Try comparison mode: Get answers from multiple models at once",
    threshold: 5,
    type: "conversation",
  },
  {
    id: "memory-extraction",
    icon: <Lightbulb className="w-4 h-4 text-primary" />,
    message: "Extract memories from conversations to improve future responses",
    threshold: 10,
    type: "message",
  },
];

interface ProgressiveHintsProps {
  messageCount: number;
  conversationCount: number;
}

export function ProgressiveHints({
  messageCount,
  conversationCount,
}: ProgressiveHintsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("blah-hints-dismissed");
      if (stored) {
        setDismissed(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load dismissed hints:", error);
    }
  }, []);

  const dismissHint = (id: string) => {
    try {
      const updated = [...dismissed, id];
      setDismissed(updated);
      localStorage.setItem("blah-hints-dismissed", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save dismissed hints:", error);
    }
  };

  // Find the first undismissed hint that meets the threshold
  const activeHint = HINTS.find(
    (h) =>
      !dismissed.includes(h.id) &&
      (h.type === "message"
        ? messageCount >= h.threshold
        : conversationCount >= h.threshold),
  );

  if (!activeHint || messageCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "mx-4 mb-2 p-3 rounded-lg flex items-center gap-3",
        "bg-primary/5 border border-primary/20",
        "backdrop-blur-sm",
      )}
    >
      {activeHint.icon}
      <span className="flex-1 text-sm">{activeHint.message}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => dismissHint(activeHint.id)}
        className="h-6 w-6 shrink-0"
        aria-label="Dismiss hint"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
