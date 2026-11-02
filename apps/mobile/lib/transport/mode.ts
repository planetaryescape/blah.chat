export type MobileTransportMode = "convex" | "http-sse";

export function getMobileTransportMode(): MobileTransportMode {
  const raw = process.env.EXPO_PUBLIC_MOBILE_TRANSPORT?.trim().toLowerCase();
  if (raw === "http" || raw === "http-sse" || raw === "sse") {
    return "http-sse";
  }

  return "convex";
}

export function shouldUseConvexTransport(): boolean {
  return getMobileTransportMode() === "convex";
}
