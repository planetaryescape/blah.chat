/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/dal/preferences", async () => {
  const { z } = await import("zod");
  return {
    preferencesDAL: {
      get: vi.fn(),
      getAll: vi.fn(),
      update: vi.fn(),
    },
    // Schema behavior is covered by the DAL schema unit tests; the route
    // tests only need a permissive stand-in.
    preferenceValueSchema: z.unknown(),
  };
});

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) => {
      return handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "test-user-id",
      });
    },
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

vi.mock("@/lib/api/monitoring", () => ({
  trackAPIPerformance: vi.fn(),
}));

import { preferencesDAL } from "@/lib/api/dal/preferences";
import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
  createMockRequest,
} from "@/lib/test/api-helpers";

describe("/api/v1/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets all preferences without a session token", async () => {
    vi.mocked(preferencesDAL.getAll).mockResolvedValue({
      status: "success",
      sys: { entity: "preferences" },
      data: { showNotes: true },
    } as any);

    const { GET } = await import("../preferences/route");
    const response = await GET(createMockRequest("/api/v1/preferences"), {
      params: Promise.resolve({}),
    });
    const json = await response.json();

    assertEnvelopeSuccess(json);
    expect(preferencesDAL.getAll).toHaveBeenCalledWith("test-user-id");
  });

  it("gets a single preference by key", async () => {
    vi.mocked(preferencesDAL.get).mockResolvedValue({
      status: "success",
      sys: { entity: "preference" },
      data: { key: "theme", value: "dark" },
    } as any);

    const { GET } = await import("../preferences/route");
    await GET(createMockRequest("/api/v1/preferences?key=theme"), {
      params: Promise.resolve({}),
    });

    expect(preferencesDAL.get).toHaveBeenCalledWith("test-user-id", "theme");
  });

  it("updates a preference without a session token", async () => {
    vi.mocked(preferencesDAL.update).mockResolvedValue({
      status: "success",
      sys: { entity: "preference" },
      data: { key: "theme", value: "dark" },
    } as any);

    const { PATCH } = await import("../preferences/route");
    const response = await PATCH(
      createMockRequest("/api/v1/preferences", {
        method: "PATCH",
        body: { key: "theme", value: "dark" },
      }),
      {
        params: Promise.resolve({}),
      },
    );
    const json = await response.json();

    assertEnvelopeSuccess(json);
    expect(preferencesDAL.update).toHaveBeenCalledWith("test-user-id", {
      key: "theme",
      value: "dark",
    });
  });

  it("rejects invalid preference payloads", async () => {
    const { PATCH } = await import("../preferences/route");
    const response = await PATCH(
      createMockRequest("/api/v1/preferences", {
        method: "PATCH",
        body: { value: "dark" },
      }),
      {
        params: Promise.resolve({}),
      },
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    assertEnvelopeError(json);
  });
});
