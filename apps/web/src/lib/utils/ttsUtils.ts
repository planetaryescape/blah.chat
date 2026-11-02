/** Clamp playback preferences to the supported range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Private speech text and synthesis options belong only in the POST body. */
export function getTTSUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  const baseUrl = convexUrl.replace(".convex.cloud", ".convex.site");
  const base = globalThis.location?.origin ?? "http://localhost";
  return new URL(baseUrl ? `${baseUrl}/tts` : "/tts", base).toString();
}
