export type MobileTransportMode = "http-sse";

export function getMobileTransportMode(): MobileTransportMode {
  return "http-sse";
}

export function supportsR2BlobTransport(): boolean {
  return true;
}
