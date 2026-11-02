import type { Id } from "../_generated/dataModel";

const encoder = new TextEncoder();

async function uploadKey() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Secure uploads are not configured");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function ownedUploadUrl(userId: Id<"users">): Promise<string> {
  const site = process.env.CONVEX_SITE_URL;
  if (!site) throw new Error("Upload endpoint is not configured");
  const payload = `${userId}:${Date.now() + 5 * 60_000}:${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await uploadKey(),
    encoder.encode(payload),
  );
  const mac = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${site}/owned-file-upload?token=${encodeURIComponent(`${payload}:${mac}`)}`;
}

export async function verifyUploadToken(token: string): Promise<string | null> {
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [userId, expiry, nonce, mac] = parts;
  if (
    !userId ||
    !nonce ||
    !/^\d+$/.test(expiry) ||
    Number(expiry) <= Date.now() ||
    Number(expiry) > Date.now() + 5 * 60_000 ||
    !/^[a-f0-9]{64}$/.test(mac)
  )
    return null;
  const bytes = new Uint8Array(
    mac.match(/../g)!.map((pair) => Number.parseInt(pair, 16)),
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    await uploadKey(),
    bytes,
    encoder.encode(`${userId}:${expiry}:${nonce}`),
  );
  return valid ? userId : null;
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new Error("Request body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Request body too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}
