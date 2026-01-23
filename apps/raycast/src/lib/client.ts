import { getPreferenceValues } from "@raycast/api";
import { ConvexHttpClient } from "convex/browser";

const DEFAULT_CONVEX_URL = "https://intent-coyote-706.convex.cloud";

interface Preferences {
  apiKey: string;
  convexUrl?: string;
}

let client: ConvexHttpClient | null = null;
let currentConvexUrl: string | null = null;

export function getApiKey(): string {
  return getPreferenceValues<Preferences>().apiKey;
}

export function getConvexUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.convexUrl?.trim() || DEFAULT_CONVEX_URL;
}

export function getClient(): ConvexHttpClient {
  const url = getConvexUrl();
  // Recreate client if URL changed
  if (!client || currentConvexUrl !== url) {
    client = new ConvexHttpClient(url);
    currentConvexUrl = url;
  }
  return client;
}
