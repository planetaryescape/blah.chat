import { useAuth } from "@clerk/nextjs";
import type { ApiResponse } from "./types";

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
): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiClientError(401, "UNAUTHORIZED", "Auth required");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  const { getToken } = useAuth();

  return {
    get: <T>(url: string) => fetchWithAuth<T>(url, { method: "GET" }, getToken),
    post: <T>(url: string, body?: unknown) =>
      fetchWithAuth<T>(
        url,
        { method: "POST", body: JSON.stringify(body) },
        getToken,
      ),
    patch: <T>(url: string, body?: unknown) =>
      fetchWithAuth<T>(
        url,
        { method: "PATCH", body: JSON.stringify(body) },
        getToken,
      ),
    delete: <T>(url: string) =>
      fetchWithAuth<T>(url, { method: "DELETE" }, getToken),
  };
}
