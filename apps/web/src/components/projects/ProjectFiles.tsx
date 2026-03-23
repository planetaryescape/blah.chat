"use client";

import { CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { KnowledgeSource } from "@/components/knowledge/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type RequestPayload<T> = {
  data?: T;
  error?: string;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as RequestPayload<T>;

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export function ProjectFiles({
  projectId,
  files,
}: {
  projectId: string;
  files: KnowledgeSource[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
      toast("Large file", {
        description: "Large files may take longer to process",
      });
    }

    setUploading(true);

    void requestJson<{
      uploadUrl: string;
      storageId: string;
    }>("/api/v1/files/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    })
      .then((upload) =>
        fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        }).then((result) => {
          if (!result.ok) {
            throw new Error("Upload failed");
          }

          return requestJson("/api/v1/knowledge/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "file",
              title: file.name,
              storageId: upload.storageId,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
              projectId,
            }),
          });
        }),
      )
      .then(() => {
        toast.success("File uploaded", {
          description: "Processing for semantic search...",
        });
        router.refresh();
      })
      .catch((error: unknown) => {
        toast.error("Upload failed", {
          description: error instanceof Error ? error.message : "Upload failed",
        });
      })
      .finally(() => {
        setUploading(false);
      });
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
            aria-label="Upload project file"
            onChange={handleUpload}
            accept=".pdf,.docx,.txt,.md"
            disabled={uploading}
          />
          <Button asChild disabled={uploading}>
            <label htmlFor="file-upload">
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
            </label>
          </Button>
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
                    <h4 className="font-medium">{file.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {((file.size ?? 0) / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(file.status)}
                  {file.status === "completed" && file.chunkCount && (
                    <Badge variant="outline">{file.chunkCount} chunks</Badge>
                  )}
                  {file.status === "failed" && (
                    <Badge variant="destructive">Failed to index</Badge>
                  )}
                  {file.status === "processing" && <Badge>Processing...</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
