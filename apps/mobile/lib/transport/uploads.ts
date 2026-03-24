import type { BlahClient } from "@blah-chat/api-client";

export type UploadAssetInput = {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

const FALLBACK_MIME_TYPE = "application/octet-stream";

export function inferUploadName(uri: string, mimeType: string): string {
  const fromUri = decodeURIComponent(uri.split("/").pop() || "");
  if (fromUri.length > 0) return fromUri;

  const extension = mimeType.split("/")[1] || "bin";
  return `attachment-${Date.now()}.${extension}`;
}

export async function uploadAssetToSignedUrl(
  client: BlahClient,
  asset: UploadAssetInput,
  conversationId?: string,
) {
  const fileResponse = await fetch(asset.uri);
  const blob = await fileResponse.blob();

  const mimeType = asset.mimeType || blob.type || FALLBACK_MIME_TYPE;
  const name = asset.name || inferUploadName(asset.uri, mimeType);
  const size = asset.size ?? blob.size;

  const upload = await client.createFileUploadUrl({
    conversationId,
    fileName: name,
    contentType: mimeType,
  });

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: { "Content-Type": mimeType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }

  return {
    name,
    mimeType,
    size,
    storageId: upload.storageId,
  };
}
