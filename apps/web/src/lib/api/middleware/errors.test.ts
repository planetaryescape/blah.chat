/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { assertEnvelopeError, createMockRequest } from "@/lib/test/api-helpers";
import { withErrorHandling } from "./errors";

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("withErrorHandling", () => {
  it("maps env-style Zod errors to configuration errors", async () => {
    const handler = withErrorHandling(async () => {
      z.object({
        DATABASE_URL: z.url(),
      }).parse({});

      return new Response("ok");
    });

    const response = await handler(createMockRequest("/api/test"), {
      params: Promise.resolve({}),
    });
    const json = await response.json();

    expect(response.status).toBe(503);
    assertEnvelopeError(json);
    expect(json.error).toMatchObject({
      message: "Service configuration error",
      code: "CONFIGURATION_ERROR",
    });
  });

  it("maps plain Zod-like config errors to configuration errors", async () => {
    const handler = withErrorHandling(async () => {
      throw {
        issues: [
          {
            path: ["DATABASE_URL"],
            message: "Required",
          },
        ],
      };
    });

    const response = await handler(createMockRequest("/api/test"), {
      params: Promise.resolve({}),
    });
    const json = await response.json();

    expect(response.status).toBe(503);
    assertEnvelopeError(json);
    expect(json.error).toMatchObject({
      message: "Service configuration error",
      code: "CONFIGURATION_ERROR",
    });
  });

  it("keeps request validation errors as 400s", async () => {
    const handler = withErrorHandling(async () => {
      z.object({
        key: z.string(),
      }).parse({});

      return new Response("ok");
    });

    const response = await handler(createMockRequest("/api/test"), {
      params: Promise.resolve({}),
    });
    const json = await response.json();

    expect(response.status).toBe(400);
    assertEnvelopeError(json);
    expect(json.error).toMatchObject({
      message: "Validation failed",
      code: "VALIDATION_ERROR",
    });
  });
});
