"use node";

import type { ActionCtx } from "../_generated/server";

/**
 * Download attachment from Convex storage and convert to base64
 * Used for sending attachments to vision models
 */
export async function downloadAttachment(
  ctx: ActionCtx,
  storageId: string,
): Promise<string> {
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Failed to get storage URL");

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  // Convert ArrayBuffer to base64 (Convex-compatible)
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return base64;
}
