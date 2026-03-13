/**
 * Shared helper for trigger.dev tasks that call Convex HTTP endpoints.
 * Centralizes env checks, URL derivation, auth, and error handling.
 */
export async function callConvexTriggerEndpoint<T = unknown>(
  taskId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }

  const secret = process.env.TRIGGER_CONVEX_SECRET;
  if (!secret) {
    throw new Error("TRIGGER_CONVEX_SECRET is not set");
  }

  const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
  if (siteUrl === convexUrl) {
    throw new Error(
      "Could not derive site URL from NEXT_PUBLIC_CONVEX_URL — expected .convex.cloud domain",
    );
  }

  const response = await fetch(`${siteUrl}/trigger/${taskId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Convex ${taskId} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}
