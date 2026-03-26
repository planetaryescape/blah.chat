/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("withAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is missing", async () => {
    authMock.mockResolvedValue({ userId: null, getToken: vi.fn() });

    const { withAuth } = await import("../auth");
    const handler = withAuth(async () => new Response("ok", { status: 200 }));

    const res = await handler(new Request("http://localhost/api") as any, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(401);
  });

  it("calls handler with userId only", async () => {
    authMock.mockResolvedValue({
      userId: "user_123",
      getToken: vi.fn().mockResolvedValue("unused"),
    });

    const { withAuth } = await import("../auth");
    const inner = vi.fn(async (_req, ctx) => {
      expect(ctx.userId).toBe("user_123");
      return new Response("ok", { status: 200 });
    });

    const handler = withAuth(inner);
    const res = await handler(new Request("http://localhost/api") as any, {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
