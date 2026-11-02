export type MobileTransportMode = "convex";

export function getMobileTransportError(): string | null {
  const raw = process.env.EXPO_PUBLIC_MOBILE_TRANSPORT?.trim().toLowerCase();
  return raw && raw !== "convex"
    ? "This mobile build requires Convex for chat, message actions and voice. Remove EXPO_PUBLIC_MOBILE_TRANSPORT or set it to convex; HTTP-only mode is not supported."
    : null;
}

export function getMobileTransportMode(): MobileTransportMode {
  const error = getMobileTransportError();
  if (error) throw new Error(error);
  return "convex";
}

export function shouldUseConvexTransport(): boolean {
  return getMobileTransportMode() === "convex";
}
