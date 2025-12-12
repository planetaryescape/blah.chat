import { ConvexHttpClient } from "convex/browser";

let _convex: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}
