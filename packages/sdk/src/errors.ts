import type { ApiEnvelope } from "./types";

export class BlahSDKError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "BlahSDKError";
  }
}

function extractMessage(error: ApiEnvelope<never>["error"]): {
  message: string;
  code?: string;
  details?: unknown;
} {
  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object") {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  return { message: "Unknown API error" };
}

export function unwrapEnvelope<T>(
  envelope: ApiEnvelope<T> | null | undefined,
  status: number,
): T {
  if (!envelope) {
    throw new BlahSDKError("Empty API response", status, "EMPTY_RESPONSE");
  }

  if (envelope.status === "error") {
    const parsed = extractMessage(envelope.error);
    throw new BlahSDKError(parsed.message, status, parsed.code, parsed.details);
  }

  return envelope.data as T;
}
