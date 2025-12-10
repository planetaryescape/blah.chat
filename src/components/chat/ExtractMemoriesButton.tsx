"use client";

import { useMutation } from "convex/react";
import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ExtractMemoriesButtonProps {
  conversationId: Id<"conversations">;
}

export function ExtractMemoriesButton({
  conversationId,
}: ExtractMemoriesButtonProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const triggerExtraction = useMutation(api.memories.triggerExtraction);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      await triggerExtraction({ conversationId });
      toast.success("Memory extraction started! This may take a few moments.");
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
