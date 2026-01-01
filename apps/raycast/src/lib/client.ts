import { getPreferenceValues } from "@raycast/api";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://intent-coyote-706.convex.cloud";

interface Preferences {
  apiKey: string;
}

let client: ConvexHttpClient | null = null;

export function getApiKey(): string {
  return getPreferenceValues<Preferences>().apiKey;
}

export function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(CONVEX_URL);
  }
  return client;
}
