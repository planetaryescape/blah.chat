"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

interface ExtractMemoriesButtonProps {
  conversationId: Id<"conversations">;
}

export function ExtractMemoriesButton({
  conversationId,
}: ExtractMemoriesButtonProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const triggerExtraction = useMutation(api.memories.triggerExtraction);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      await triggerExtraction({ conversationId });
      toast.success("Memory extraction started! This may take a few moments.");

      // Track manual memory extraction
      analytics.track("memory_extraction_triggered", {
        source: "manual",
        conversationId,
      });
    } catch (_error) {
      toast.error("Failed to start extraction");
    } finally {
      // Keep loading for a bit to indicate processing
      setTimeout(() => setIsExtracting(false), 3000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExtract}
      disabled={isExtracting}
      className="gap-2"
    >
      {isExtracting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Extracting...
        </>
      ) : (
        <>
          <Brain className="h-4 w-4" />
          Extract Memories
        </>
      )}
    </Button>
  );
}
