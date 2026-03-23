"use client";

import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useSDKClient } from "@/lib/api/sdkClient";

interface ExtractMemoriesButtonProps {
  conversationId: string;
}

export function ExtractMemoriesButton({
  conversationId,
}: ExtractMemoriesButtonProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const sdk = useSDKClient();

  const handleExtract = () => {
    setIsExtracting(true);
    void sdk
      .extractMemories(conversationId)
      .then(() => {
        toast.success(
          "Memory extraction started! This may take a few moments.",
        );
        analytics.track("memory_extraction_triggered", {
          source: "manual",
          conversationId,
        });
      })
      .catch(() => {
        toast.error("Failed to start extraction");
      })
      .finally(() => {
        setTimeout(() => setIsExtracting(false), 3000);
      });
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
