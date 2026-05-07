/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processFn = vi.fn();

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({ process: processFn }),
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "@/app/api/internal/generations/[id]/process/route";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
  createMockRequest,
} from "@/lib/test/api-helpers";

const ORIGINAL_SECRET = process.env.INTERNAL_TASK_SECRET;

beforeEach(() => {
  processFn.mockReset();
  process.env.INTERNAL_TASK_SECRET = "test-shared-secret-12345678";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.INTERNAL_TASK_SECRET;
  } else {
    process.env.INTERNAL_TASK_SECRET = ORIGINAL_SECRET;
  }
});

describe("POST /api/internal/generations/[id]/process", () => {
  it("returns 200 and the resulting status when the shared secret is valid", async () => {
    processFn.mockResolvedValue("complete");

    const req = createMockRequest("/api/internal/generations/req-1/process", {
      method: "POST",
      headers: { Authorization: "Bearer test-shared-secret-12345678" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "req-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    assertEnvelopeSuccess(body);
    expect(body.data).toMatchObject({
      requestId: "req-1",
      status: "complete",
    });
    expect(processFn).toHaveBeenCalledWith("req-1");
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const req = createMockRequest("/api/internal/generations/req-2/process", {
      method: "POST",
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "req-2" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    assertEnvelopeError(body);
    expect(processFn).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token does not match the configured secret", async () => {
    const req = createMockRequest("/api/internal/generations/req-3/process", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "req-3" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    assertEnvelopeError(body);
    expect(processFn).not.toHaveBeenCalled();
  });

  it("returns 503 when INTERNAL_TASK_SECRET env var is not configured", async () => {
    delete process.env.INTERNAL_TASK_SECRET;

    const req = createMockRequest("/api/internal/generations/req-4/process", {
      method: "POST",
      headers: { Authorization: "Bearer anything" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "req-4" }),
    });

    expect(response.status).toBe(503);
    const body = await response.json();
    assertEnvelopeError(body);
    expect(processFn).not.toHaveBeenCalled();
  });
});
