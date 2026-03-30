import { createBlahClient } from "@blah-chat/api-client";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { getDesktopClientHeaders } from "@/lib/platform/desktopShell";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "https://blah.chat";
}

function browserFetchWithCookies(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  if (typeof window === "undefined") {
    return fetch(input, init);
  }

  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const resolvedUrl = new URL(requestUrl, window.location.origin);
  const sameOrigin = resolvedUrl.origin === window.location.origin;

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? (sameOrigin ? "include" : undefined),
  });
}

export function useSDKClient() {
  const { getToken } = useAuth();
  const baseUrl = getBaseUrl();

  return useMemo(
    () =>
      createBlahClient({
        baseUrl,
        getAccessToken: getToken,
        allowCookieAuthFallback: true,
        headers: getDesktopClientHeaders(),
        fetch: browserFetchWithCookies,
      }),
    [baseUrl, getToken],
  );
}
