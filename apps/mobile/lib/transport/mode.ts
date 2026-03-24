export type MobileTransportMode = "convex" | "http-sse";

export function getMobileTransportMode(): MobileTransportMode {
  const raw = process.env.EXPO_PUBLIC_MOBILE_TRANSPORT?.trim().toLowerCase();
  if (raw === "convex") {
    return "convex";
  }

  return "http-sse";
}

export function shouldUseConvexTransport(): boolean {
  return getMobileTransportMode() === "convex";
}

export function supportsR2BlobTransport(): boolean {
  return !shouldUseConvexTransport();
}
