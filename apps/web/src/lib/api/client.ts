import { useAuth, useSession } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { getDesktopClientHeaders } from "@/lib/platform/desktopShell";
import type { ApiResponse } from "./types";

const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
  ) {
    super(message || `API Error: ${status}`);
    this.name = "ApiClientError";
  }
}

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit,
  getToken: () => Promise<string | null>,
  isCurrent: () => boolean,
): Promise<T> {
  const token = await getToken();
  if (!token || !isCurrent())
    throw new ApiClientError(401, "UNAUTHORIZED", "Auth required");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getDesktopClientHeaders(),
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || data.status === "error") {
    const msg =
      typeof data.error === "string" ? data.error : data.error?.message;
    const code = typeof data.error === "object" ? data.error?.code : undefined;
    throw new ApiClientError(response.status, code, msg);
  }

  return data.data as T; // Unwrap envelope
}

export function useApiClient() {
  const { isLoaded, userId, sessionId } = useAuth();
  const { isLoaded: sessionLoaded, session } = useSession();
  const committed = useRef<{
    isLoaded: boolean;
    userId: typeof userId;
    sessionId: typeof sessionId;
    session: typeof session;
  } | null>(null);
  useCommitEffect(() => {
    committed.current = {
      isLoaded: isLoaded && sessionLoaded,
      userId,
      sessionId,
      session,
    };
    return () => {
      committed.current = null;
    };
  }, [isLoaded, sessionLoaded, userId, sessionId, session]);

  return useMemo(() => {
    // Publish auth only on commit; suspended renders cannot change a live client.
    // Bind token acquisition to that session resource, not Clerk's global getter.
    const ownsSession = () =>
      isLoaded &&
      !!userId &&
      !!committed.current?.isLoaded &&
      committed.current.userId === userId &&
      committed.current.sessionId === sessionId &&
      committed.current.session?.id === sessionId;
    const getToken = async () => {
      const current = committed.current;
      if (!ownsSession() || !current?.session) return null;
      const token = await current.session.getToken();
      return ownsSession() ? token : null;
    };
    return {
      get: <T>(url: string) =>
        fetchWithAuth<T>(url, { method: "GET" }, getToken, ownsSession),
      post: <T>(url: string, body?: unknown) =>
        fetchWithAuth<T>(
          url,
          { method: "POST", body: JSON.stringify(body) },
          getToken,
          ownsSession,
        ),
      patch: <T>(url: string, body?: unknown) =>
        fetchWithAuth<T>(
          url,
          { method: "PATCH", body: JSON.stringify(body) },
          getToken,
          ownsSession,
        ),
      delete: <T>(url: string) =>
        fetchWithAuth<T>(url, { method: "DELETE" }, getToken, ownsSession),
    };
  }, [isLoaded, userId, sessionId]);
}
