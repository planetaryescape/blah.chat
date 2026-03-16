"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
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
  conversationId?: Id<"conversations">;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onUploadComplete?: () => void;
  maxSizeMB?: number;
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
    async (acceptedFiles: File[]) => {
      if (!conversationId) {
        toast.error("Conversation not ready for uploads");
        return;
      }

      setUploading(true);

      try {
        const newAttachments: Attachment[] = [];

        for (const file of acceptedFiles) {
          // Validate size
          if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
            continue;
          }

          const { uploadUrl, storageId } = await apiClient.post<{
            uploadUrl: string;
            storageId: string;
          }>("/api/v1/files/upload-url", {
            conversationId,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
          });

          // Upload file
          const result = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!result.ok) {
            throw new Error("Failed to upload file");
          }

          // Determine type
          let type: "file" | "image" | "audio" = "file";
          if (file.type.startsWith("image/")) type = "image";
          else if (file.type.startsWith("audio/")) type = "audio";

          newAttachments.push({
            type,
            name: file.name,
            storageId,
            mimeType: file.type,
            size: file.size,
            url: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          });

          // Track each attachment upload
          analytics.track("attachment_uploaded", {
            type,
            size: file.size,
            mimeType: file.type,
            countPerMessage: 1,
          });
        }

        onAttachmentsChange([...attachments, ...newAttachments]);
        toast.success(
          `Uploaded ${newAttachments.length} file${
            newAttachments.length === 1 ? "" : "s"
          }`,
        );
        // Focus input after successful upload
        onUploadComplete?.();
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error("Failed to upload files");
      } finally {
        setUploading(false);
      }
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
