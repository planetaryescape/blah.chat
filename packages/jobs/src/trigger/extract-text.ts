import { task } from "@trigger.dev/sdk";

export const extractTextTask = task({
  id: "extract-text",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: {
    attachmentId: string;
    storageId: string;
    fileName: string;
    mimeType: string;
  }) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");

    const secret = process.env.TRIGGER_CONVEX_SECRET;
    if (!secret) throw new Error("TRIGGER_CONVEX_SECRET is not set");

    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/trigger/extract-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Convex extract-text failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as { success: boolean };
  },
});
