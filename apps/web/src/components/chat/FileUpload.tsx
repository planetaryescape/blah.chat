"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

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
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
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
          `Uploaded ${newAttachments.length} file${newAttachments.length === 1 ? "" : "s"}`,
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
      conversationId,
      generateUploadUrl,
      maxSizeMB,
      onAttachmentsChange,
      onUploadComplete,
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
      size="icon"
      {...getRootProps()}
      disabled={uploading}
      title="Attach files"
      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
      <span className="sr-only">Attach files</span>
    </Button>
  );
}
