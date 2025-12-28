interface UploadOptions {
  generateUploadUrl: () => Promise<string>;
  fileUri: string;
  mimeType: string;
}

interface UploadResult {
  storageId: string;
}

export async function uploadToConvex({
  generateUploadUrl,
  fileUri,
  mimeType,
}: UploadOptions): Promise<string> {
  // Get upload URL from Convex
  const uploadUrl = await generateUploadUrl();

  // Fetch file directly from URI (React Native supports file:// URIs)
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  // Upload to Convex
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });

  if (!result.ok) {
    throw new Error(`Upload failed: ${result.statusText}`);
  }

  const { storageId } = (await result.json()) as UploadResult;
  return storageId;
}
