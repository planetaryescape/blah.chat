import { useAuth } from "@clerk/clerk-expo";
import { toast } from "burnt";
import { useCallback, useState } from "react";
import type { Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { supportsR2BlobTransport } from "@/lib/transport/mode";
import {
  inferUploadName,
  type UploadAssetInput,
  uploadAssetToSignedUrl,
} from "@/lib/transport/uploads";

export type UploadedAttachment = {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
};

function mapAttachmentType(mimeType: string): UploadedAttachment["type"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

export function useChatAttachmentUpload(conversationId?: Id<"conversations">) {
  const isAvailable = supportsR2BlobTransport();
  const { getToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAsset = useCallback(
    async (asset: UploadAssetInput): Promise<UploadedAttachment | null> => {
      if (!isAvailable) {
        return null;
      }

      setIsUploading(true);

      try {
        const client = createMobileSdkClient(() => getToken());
        const uploaded = await uploadAssetToSignedUrl(
          client,
          {
            ...asset,
            name:
              asset.name ||
              (asset.mimeType
                ? inferUploadName(asset.uri, asset.mimeType)
                : undefined),
          },
          conversationId,
        );

        return {
          type: mapAttachmentType(uploaded.mimeType),
          name: uploaded.name,
          storageId: uploaded.storageId,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
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
    [conversationId, getToken, isAvailable],
  );

  return {
    isUploading,
    isAvailable,
    uploadAsset,
  };
}
