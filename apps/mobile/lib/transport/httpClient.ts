import { createBlahClient } from "@blah-chat/sdk";

const DEFAULT_APP_URL = "https://blah.chat";

function resolveAppUrl(): string {
  return process.env.EXPO_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

export function createMobileSdkClient(getToken: () => Promise<string | null>) {
  return createBlahClient({
    baseUrl: resolveAppUrl(),
    getAccessToken: getToken,
  });
}
