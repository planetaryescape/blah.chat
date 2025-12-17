"use client";

import { useMutation } from "convex/react";
import { CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ProjectFiles({
  projectId,
  files,
}: {
  projectId: Id<"projects">;
  files: any[];
}) {
  const [uploading, setUploading] = useState(false);

  // @ts-ignore - Type depth exceeded
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded
  const saveFile = useMutation(api.files.saveFile);
  // @ts-ignore - Type depth exceeded
  const addFileToProject = useMutation(api.projects.addFileToProject);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 50MB",
      });
      return;
    }

    if (file.size > WARN_FILE_SIZE) {
      const confirmed = confirm(
        `This file is ${Math.round(file.size / 1024 / 1024)}MB. Large files may take time to process. Continue?`,
      );
      if (!confirmed) return;
    }

    setUploading(true);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save file metadata
      const fileId = await saveFile({
        storageId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Link to project
      await addFileToProject({ projectId, fileId });

      toast.success("File uploaded", {
        description: "Processing for semantic search...",
      });
    } catch (error: any) {
      toast.error("Upload failed", {
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-medium">Project Files</h3>
        <div>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            onChange={handleUpload}
            accept=".pdf,.docx,.txt,.md"
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-medium">No files yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents to enable semantic search in project chats
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file._id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{file.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(file.embeddingStatus)}
                  {file.embeddingStatus === "completed" && file.chunkCount && (
                    <Badge variant="outline">{file.chunkCount} chunks</Badge>
                  )}
                  {file.embeddingStatus === "failed" && (
                    <Badge variant="destructive">Failed to index</Badge>
                  )}
                  {file.embeddingStatus === "processing" && (
                    <Badge>Processing...</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
