/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setupMock, getMock } = vi.hoisted(() => ({
  setupMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@/lib/api/dal/byod", () => ({
  byodDAL: {
    get: getMock,
    setup: setupMock,
    disconnect: vi.fn(),
  },
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withUserAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) => {
      return handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_123",
      });
    },
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/v1/byod/route";
import { assertEnvelopeError, createMockRequest } from "@/lib/test/api-helpers";

const ORIGINAL_FLAG = process.env.BYOD_CHAT_ROUTING_ENABLED;

beforeEach(() => {
  setupMock.mockReset();
  getMock.mockReset();
  delete process.env.BYOD_CHAT_ROUTING_ENABLED;
});

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.BYOD_CHAT_ROUTING_ENABLED;
  } else {
    process.env.BYOD_CHAT_ROUTING_ENABLED = ORIGINAL_FLAG;
  }
});

describe("POST /api/v1/byod preview gate", () => {
  it("returns 503 with a preview-mode envelope when the routing flag is unset", async () => {
    const req = createMockRequest("/api/v1/byod", {
      method: "POST",
      body: { connectionString: "postgres://example/userdb" },
    });

    const response = await POST(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(503);
    const body = await response.json();
    assertEnvelopeError(body);
    expect(JSON.stringify(body.error).toLowerCase()).toContain("preview");
    expect(setupMock).not.toHaveBeenCalled();
  });

  it("calls byodDAL.setup when BYOD_CHAT_ROUTING_ENABLED=1", async () => {
    process.env.BYOD_CHAT_ROUTING_ENABLED = "1";
    setupMock.mockResolvedValue({
      status: "success",
      sys: { entity: "byod" },
      data: { id: "byod_1", connectionStatus: "pending" },
    });

    const req = createMockRequest("/api/v1/byod", {
      method: "POST",
      body: { connectionString: "postgres://example/userdb" },
    });

    const response = await POST(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(setupMock).toHaveBeenCalledWith(
      "user_123",
      "postgres://example/userdb",
    );
  });
});
