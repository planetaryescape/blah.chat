function getConvexSiteUrl() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }

  const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
  if (siteUrl === convexUrl) {
    throw new Error(
      "Could not derive site URL from NEXT_PUBLIC_CONVEX_URL — expected .convex.cloud domain",
    );
  }

  return siteUrl;
}

/**
 * Legacy-domain compatibility helper.
 * Remaining legacy Trigger tasks call Convex's task endpoints directly,
 * without hopping through the web app bridge.
 */
export async function callLegacyConvexTrigger<T = unknown>(
  taskId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const secret = process.env.TRIGGER_CONVEX_SECRET;
  if (!secret) {
    throw new Error("TRIGGER_CONVEX_SECRET is not set");
  }

  const response = await fetch(
    `${getConvexSiteUrl()}/trigger/${encodeURIComponent(taskId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300_000),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Legacy Convex trigger ${taskId} failed (${response.status}): ${body}`,
    );
  }

  return (await response.json()) as T;
}
