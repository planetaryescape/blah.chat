"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  Download,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  presentationId: Id<"presentations">;
  aspectRatio?: "16:9" | "1:1" | "9:16";
}

type DownloadFormat = "pptx" | "pdf" | "images";

export function DownloadButton({
  presentationId,
  aspectRatio = "16:9",
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] =
    useState<DownloadFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const presentation = useQuery(api.presentations.get, { presentationId });
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const downloadPPTX = useMutation(api.presentations.downloadPPTX);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const downloadPDF = useMutation(api.presentations.downloadPDF);
  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const downloadImages = useMutation(api.presentations.downloadImages);

  const triggerDownload = useCallback(
    (format: DownloadFormat) => {
      const url = `/api/download/${format === "images" ? "images" : format}/${presentationId}`;
      console.log(`[DownloadButton] Triggering ${format} download via:`, url);

      const link = document.createElement("a");
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [presentationId],
  );

  // Poll for completion when generating
  useEffect(() => {
    if (!isGenerating || !presentation || !generatingFormat) return;

    const url =
      generatingFormat === "pptx"
        ? presentation.pptxUrl
        : generatingFormat === "pdf"
          ? (presentation as { pdfUrl?: string }).pdfUrl
          : (presentation as { imagesZipUrl?: string }).imagesZipUrl;

    if (url) {
      console.log(
        `[DownloadButton] ${generatingFormat} ready, triggering download`,
      );
      setIsGenerating(false);
      setGeneratingFormat(null);
      triggerDownload(generatingFormat);
    }
  }, [isGenerating, presentation, generatingFormat, triggerDownload]);

  const handleDownload = async (format: DownloadFormat) => {
    if (!presentation) return;

    setError(null);
    console.log(`[DownloadButton] handleDownload called for ${format}`);

    try {
      let result;

      if (format === "pptx") {
        result = await downloadPPTX({ presentationId, forceRegenerate: true });
      } else if (format === "pdf") {
        result = await downloadPDF({ presentationId, forceRegenerate: true });
      } else {
        result = await downloadImages({
          presentationId,
          forceRegenerate: true,
        });
      }

      console.log("[DownloadButton] Mutation result:", result);

      if (result.cached && result.url) {
        triggerDownload(format);
      } else if (result.generating) {
        setIsGenerating(true);
        setGeneratingFormat(format);
      }
    } catch (err) {
      console.error("Download error:", err);
      setError(`Failed to generate ${format.toUpperCase()}. Please try again.`);
      setIsGenerating(false);
      setGeneratingFormat(null);
    }
  };

  const isDisabled =
    !presentation || presentation.status !== "slides_complete" || isGenerating;

  const formatLabel =
    generatingFormat === "pptx"
      ? "PPTX"
      : generatingFormat === "pdf"
        ? "PDF"
        : "Images";

  // For 16:9 presentations, show single PPTX button
  if (aspectRatio === "16:9") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload("pptx")}
          disabled={isDisabled}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {formatLabel}...
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

  // For 1:1 and 9:16, show dropdown with PDF and Images options
  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isDisabled}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating {formatLabel}...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
                <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("images")}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Download as Images (ZIP)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
