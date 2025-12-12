"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const WARN_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export function VideoUploadTab({
  onAnalysisComplete,
  onError,
}: {
  onAnalysisComplete: (result: {
    transcript: string;
    summary: string;
    keyTopics: string[];
    actionItems: string[];
  }) => void;
  onError: (error: string) => void;
}) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // @ts-ignore - Type depth exceeded
  const analyzeVideo = useAction(api.videoAnalysis.analyzeVideo);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("Video too large", {
        description: "Maximum file size is 2GB",
      });
      return;
    }

    // Validate format
    const validFormats = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!validFormats.includes(file.type)) {
      toast.error("Unsupported format", {
        description: "Please upload MP4, WebM, MOV, or AVI files",
      });
      return;
    }

    setVideoFile(file);
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    // Warn for large files
    if (videoFile.size > WARN_VIDEO_SIZE) {
      const confirmed = confirm(
        `This video is ${Math.round(videoFile.size / 1024 / 1024)}MB. Processing may take several minutes. Continue?`,
      );
      if (!confirmed) return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Convert to base64
      toast.info("Encoding video...");
      const reader = new FileReader();

      const base64Video = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      setProgress(30);

      // Analyze video
      toast.info("Analyzing video with Gemini...");
      const result = await analyzeVideo({
        videoBase64: base64Video,
        mimeType: videoFile.type,
        filename: videoFile.name,
        sizeBytes: videoFile.size,
      });

      setProgress(100);
      toast.success("Video analyzed successfully");
      onAnalysisComplete(result);
    } catch (error: any) {
      console.error("Video upload error:", error);
      toast.error("Video processing failed", {
        description: error.message,
      });
      onError(error.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted p-12">
          <Video className="mb-4 h-12 w-12 text-muted-foreground" />
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleVideoSelect}
            className="hidden"
            id="video-upload"
            disabled={uploading}
          />
          <label htmlFor="video-upload">
            <Button variant="outline" asChild disabled={uploading}>
              <span>Choose Video File</span>
            </Button>
          </label>
          {videoFile && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              <p>{videoFile.name}</p>
              <p>({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</p>
            </div>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!videoFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing ({progress}%)...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Analyze Video
            </>
          )}
        </Button>

        {uploading && progress > 0 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Supported formats: MP4, WebM, MOV, AVI (max 2GB)
        </p>
      </div>
    </Card>
  );
}
