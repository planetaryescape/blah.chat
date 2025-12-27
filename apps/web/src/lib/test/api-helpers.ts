/**
 * API Route Test Helpers
 * Utilities for testing Next.js API routes with Vitest
 */
import type { NextRequest } from "next/server";
import { expect } from "vitest";

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers: customHeaders = {} } = options;
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...customHeaders },
    ...(body && { body: JSON.stringify(body) }),
  }) as unknown as NextRequest;
}

/**
 * Assert response follows success envelope structure
 */
export function assertEnvelopeSuccess(response: unknown): void {
  expect(response).toHaveProperty("status", "success");
  expect(response).toHaveProperty("sys");
  expect((response as { sys: { entity: string } }).sys).toHaveProperty(
    "entity",
  );
  expect(response).toHaveProperty("data");
}

/**
 * Assert response follows error envelope structure
 */
export function assertEnvelopeError(response: unknown): void {
  expect(response).toHaveProperty("status", "error");
  expect(response).toHaveProperty("sys");
  expect((response as { sys: { entity: string } }).sys.entity).toBe("error");
  expect(response).toHaveProperty("error");
}

/**
 * Extract data from success envelope
 */
export function unwrapData<T>(response: { status: string; data?: T }): T {
  expect(response.status).toBe("success");
  return response.data as T;
}
