import { toast } from "burnt";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import type { Id } from "@/lib/convex";
import { api } from "@/lib/convex";

export type UploadedAttachment = {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
};

export type UploadAssetInput = {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

const FALLBACK_MIME_TYPE = "application/octet-stream";

function inferName(uri: string, mimeType: string): string {
  const fromUri = decodeURIComponent(uri.split("/").pop() || "");
  if (fromUri.length > 0) return fromUri;

  const extension = mimeType.split("/")[1] || "bin";
  return `attachment-${Date.now()}.${extension}`;
}

function mapAttachmentType(mimeType: string): UploadedAttachment["type"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

export function useChatAttachmentUpload(conversationId?: Id<"conversations">) {
  // @ts-ignore - Type depth exceeded with complex Convex mutation modules
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  // @ts-ignore - Type depth exceeded with complex Convex mutation modules
  const saveFile = useMutation(api.files.saveFile);

  const [isUploading, setIsUploading] = useState(false);

  const uploadAsset = useCallback(
    async (asset: UploadAssetInput): Promise<UploadedAttachment | null> => {
      setIsUploading(true);

      try {
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();

        const mimeType = asset.mimeType || blob.type || FALLBACK_MIME_TYPE;
        const name = asset.name || inferName(asset.uri, mimeType);
        const size = asset.size ?? blob.size;

        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: string;
        };

        await saveFile({
          storageId,
          name,
          mimeType,
          size,
          conversationId,
        });

        return {
          type: mapAttachmentType(mimeType),
          name,
          storageId,
          mimeType,
          size,
        };
      } catch {
        toast({
          preset: "error",
          title: "Failed to upload attachment",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [conversationId, generateUploadUrl, saveFile],
  );

  return {
    isUploading,
    uploadAsset,
  };
}
