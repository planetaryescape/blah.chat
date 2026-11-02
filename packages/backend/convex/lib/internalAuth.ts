// Web Crypto is available in both Convex runtimes. Compare fixed-length MACs
// rather than attacker-controlled strings; no early-exit secret comparison.
export async function hasInternalAuthorization(
  headers: Headers,
): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET;
  const authorization = headers.get("Authorization");
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer "))
    return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(secret),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(authorization.slice(7)),
  );
}

export function internalAuthorization(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Internal service authentication is not configured");
  return `Bearer ${secret}`;
}
