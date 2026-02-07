import { createBlahClient } from "@blah-chat/sdk";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { getDesktopClientHeaders } from "@/lib/platform/desktopShell";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "https://blah.chat";
}

export function useSDKClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createBlahClient({
        baseUrl: getBaseUrl(),
        getAccessToken: getToken,
        headers: getDesktopClientHeaders(),
      }),
    [getToken],
  );
}
