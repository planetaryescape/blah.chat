export type MobileTransportMode = "http-sse";

export function getMobileTransportMode(): MobileTransportMode {
  return "http-sse";
}

export function shouldUseConvexTransport(): boolean {
  return false;
}

export function supportsR2BlobTransport(): boolean {
  return true;
}
