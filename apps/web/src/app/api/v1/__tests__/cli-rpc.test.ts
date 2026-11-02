/**
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";

const queryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("@/lib/api/convex", () => ({
  getConvexClient: vi.fn(() => ({
    query: queryMock,
    mutation: mutationMock,
  })),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

describe("/api/v1/cli/rpc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a private 400 envelope for malformed JSON after API-key authentication", async () => {
    queryMock.mockResolvedValueOnce({
      userId: "user_123",
      email: "test@example.com",
      name: "Test User",
    });
    const { POST } = await import("../cli/rpc/route");
    const request = new NextRequest("https://example.com/api/v1/cli/rpc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "blah_valid",
      },
      body: "{",
    });
    const response = await POST(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).status).toBe("error");
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("returns 401 when API key is missing", async () => {
    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid API key", async () => {
    queryMock.mockResolvedValueOnce(null);

    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
      headers: {
        "x-api-key": "blah_invalid",
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it("returns success envelope for validateApiKey", async () => {
    queryMock.mockResolvedValueOnce({
      userId: "user_123",
      email: "test@example.com",
      name: "Test User",
    });

    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
      headers: {
        "x-api-key": "blah_valid",
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("success");
    expect(json.data.userId).toBe("user_123");
  });
});
