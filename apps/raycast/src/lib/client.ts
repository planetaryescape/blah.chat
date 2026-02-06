import { type BlahClient, createBlahClient } from "@blah-chat/sdk";
import { getPreferenceValues } from "@raycast/api";

const DEFAULT_CONVEX_URL = "https://compassionate-bee-117.convex.cloud";
const DEFAULT_APP_URL = "https://blah.chat";

interface Preferences {
  apiKey: string;
  convexUrl?: string;
  appUrl?: string;
}

let client: BlahClient | null = null;
let currentCacheKey: string | null = null;

export function getApiKey(): string {
  return getPreferenceValues<Preferences>().apiKey;
}

export function getConvexUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.convexUrl?.trim() || DEFAULT_CONVEX_URL;
}

export function getAppUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.appUrl?.trim() || DEFAULT_APP_URL;
}

export function getClient(): BlahClient {
  const baseUrl = getAppUrl();
  const apiKey = getApiKey();
  const cacheKey = `${baseUrl}::${apiKey}`;

  if (!client || currentCacheKey !== cacheKey) {
    client = createBlahClient({
      baseUrl,
      apiKey,
    });
    currentCacheKey = cacheKey;
  }

  return client;
}
