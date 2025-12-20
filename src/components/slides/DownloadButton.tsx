"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Props {
  presentationId: Id<"presentations">;
}

export function DownloadButton({ presentationId }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const downloadPPTX = useMutation(api.presentations.downloadPPTX);

  // Trigger download via API route using anchor element
  const triggerDownload = useCallback(() => {
    const url = `/api/download/pptx/${presentationId}`;
    console.log("[DownloadButton] Triggering download via:", url);

    // Use anchor element for proper download behavior
    const link = document.createElement("a");
    link.href = url;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [presentationId]);

  // Poll for PPTX completion when generating
  useEffect(() => {
    if (!isGenerating || !presentation) return;

    // If PPTX URL is now available, trigger download via API route
    if (presentation.pptxUrl) {
      console.log("[DownloadButton] PPTX ready, triggering download");
      setIsGenerating(false);
      triggerDownload();
    }
  }, [isGenerating, presentation, triggerDownload]);

  const handleDownload = async () => {
    if (!presentation) return;

    setError(null);
    console.log("[DownloadButton] handleDownload called, pptxUrl:", presentation.pptxUrl);

    try {
      // Always regenerate to ensure PPTX has latest images
      const result = await downloadPPTX({ presentationId, forceRegenerate: true });
      console.log("[DownloadButton] Mutation result:", result);

      if (result.cached && result.url) {
        // Shouldn't happen with forceRegenerate, but handle anyway
        triggerDownload();
      } else if (result.generating) {
        // Generation started, poll for completion
        setIsGenerating(true);
      }
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to generate PPTX. Please try again.");
      setIsGenerating(false);
    }
  };

  const isDisabled =
    !presentation ||
    presentation.status !== "slides_complete" ||
    isGenerating;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDisabled}>
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating PPTX...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
