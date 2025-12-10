"use client";

import { useMutation } from "convex/react";
import { Loader2, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  maxSizeMB?: number;
}

export function FileUpload({
  conversationId,
  attachments,
  onAttachmentsChange,
  maxSizeMB = 10,
  uploading,
  setUploading,
}: FileUploadProps & {
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);

      try {
        const newAttachments: Attachment[] = [];

        for (const file of acceptedFiles) {
          // Validate size
          if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
            continue;
          }

          // Get upload URL
          const uploadUrl = await generateUploadUrl();

          // Upload file
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          const { storageId } = await result.json();

          // Save file metadata
          await saveFile({
            storageId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            conversationId,
          });

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
          });
        }

        onAttachmentsChange([...attachments, ...newAttachments]);
        toast.success(
          `Uploaded ${newAttachments.length} file${newAttachments.length === 1 ? "" : "s"}`,
        );
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error("Failed to upload files");
      } finally {
        setUploading(false);
      }
    },
    [
      attachments,
      conversationId,
      generateUploadUrl,
      maxSizeMB,
      onAttachmentsChange,
      saveFile,
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
      {...getRootProps()}
      disabled={uploading}
      title="Attach files"
      className="h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1.5"
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Upload className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">Attach</span>
      <span className="sr-only">Attach files</span>
    </Button>
  );
}
