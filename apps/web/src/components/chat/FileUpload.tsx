"use client";

import { Loader2, Paperclip } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";

interface Attachment {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
  url?: string;
}

interface FileUploadProps {
  conversationId?: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onUploadComplete?: () => void;
  maxSizeMB?: number;
}

type UploadApiClient = {
  post<T>(path: string, body?: unknown): Promise<T>;
};

async function uploadAttachmentFile(args: {
  apiClient: UploadApiClient;
  conversationId: string;
  file: File;
}) {
  const { apiClient, conversationId, file } = args;
  const { uploadUrl, storageId } = await apiClient.post<{
    uploadUrl: string;
    storageId: string;
  }>("/api/v1/files/upload-url", {
    conversationId,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
  });

  const result = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!result.ok) {
    throw new Error("Failed to upload file");
  }

  let type: "file" | "image" | "audio" = "file";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("audio/")) type = "audio";

  return {
    attachment: {
      type,
      name: file.name,
      storageId,
      mimeType: file.type,
      size: file.size,
      url: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    } satisfies Attachment,
    analyticsPayload: {
      type,
      size: file.size,
      mimeType: file.type,
      countPerMessage: 1,
    },
  };
}

export function FileUpload({
  conversationId,
  attachments,
  onAttachmentsChange,
  onUploadComplete,
  maxSizeMB = 10,
  uploading,
  setUploading,
}: FileUploadProps & {
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}) {
  const apiClient = useApiClient();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!conversationId) {
        toast.error("Conversation not ready for uploads");
        return;
      }

      setUploading(true);
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size <= maxSizeMB * 1024 * 1024) {
          return true;
        }

        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      });

      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }

      void Promise.all(
        validFiles.map((file) =>
          uploadAttachmentFile({ apiClient, conversationId, file }),
        ),
      )
        .then((uploads) => {
          uploads.forEach(({ analyticsPayload }) => {
            analytics.track("attachment_uploaded", analyticsPayload);
          });
          const newAttachments = uploads.map(({ attachment }) => attachment);
          onAttachmentsChange([...attachments, ...newAttachments]);
          toast.success(
            `Uploaded ${newAttachments.length} file${
              newAttachments.length === 1 ? "" : "s"
            }`,
          );
          onUploadComplete?.();
        })
        .catch((error) => {
          console.error("Upload failed:", error);
          toast.error("Failed to upload files");
        })
        .finally(() => {
          setUploading(false);
        });
    },
    [
      attachments,
      apiClient,
      conversationId,
      maxSizeMB,
      onAttachmentsChange,
      onUploadComplete,
      setUploading,
    ],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled: uploading,
    maxSize: maxSizeMB * 1024 * 1024,
    noClick: false,
    noKeyboard: false,
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      {...getRootProps()}
      disabled={uploading}
      title="Attach files"
      className="w-8 h-8 transition-colors rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Paperclip className="w-5 h-5" />
      )}
      <span className="sr-only">Attach files</span>
    </Button>
  );
}
