/**
 * @vitest-environment node
 */

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { withAdminAuth } from "@/lib/api/middleware/auth";

// `server-only` is a runtime barrel that throws if imported in the browser. In
// vitest (node env) it has no effect — stub it so DAL imports resolve.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/persistence/adminSettings", () => ({
  ADMIN_SETTINGS_TAG: "admin-settings",
  getAdminSettings: vi.fn(),
  updateAdminSettings: vi.fn(),
}));

vi.mock("@/lib/persistence/autoRouter", () => ({
  AUTO_ROUTER_CONFIG_TAG: "auto-router-config",
  getAutoRouterConfig: vi.fn(),
  updateAutoRouterConfig: vi.fn(),
}));

vi.mock("@/lib/api/middleware/auth", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/middleware/auth")
  >("@/lib/api/middleware/auth");
  return {
    ...actual,
    withAdminAuth:
      (handler: RouteHandler) =>
      async (req: NextRequest, ctx: RouteContext) => {
        // Allow per-test override of admin status via req header.
        const isAdmin = req.headers.get("x-test-is-admin") !== "false";
        if (!isAdmin) {
          return new Response(
            JSON.stringify({
              status: "error",
              error: { message: "Admin only" },
            }),
            { status: 403 },
          );
        }
        return handler(req, {
          params: ctx.params,
          userId: "admin_user_1",
        });
      },
  };
});

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  getAdminSettings,
  updateAdminSettings,
} from "@/lib/persistence/adminSettings";
import {
  getAutoRouterConfig,
  updateAutoRouterConfig,
} from "@/lib/persistence/autoRouter";

const adminMock = vi.mocked(getAdminSettings);
const adminUpdateMock = vi.mocked(updateAdminSettings);
const routerMock = vi.mocked(getAutoRouterConfig);
const routerUpdateMock = vi.mocked(updateAutoRouterConfig);

interface RouteContext {
  params: Promise<Record<string, string | string[]>>;
}
type RouteHandler = Parameters<typeof withAdminAuth>[0];

const makeReq = (
  url: string,
  init?: RequestInit & { isAdmin?: boolean },
): NextRequest => {
  const headers = new Headers(init?.headers);
  if (init?.isAdmin === false) headers.set("x-test-is-admin", "false");
  return new Request(url, { ...init, headers }) as unknown as NextRequest;
};

const routeContext: RouteContext = { params: Promise.resolve({}) };

describe("/api/v1/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns merged settings under data envelope", async () => {
    adminMock.mockResolvedValue({
      limits: {
        defaultMonthlyBudget: 10,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        defaultMaxIntegrations: 5,
      },
      features: {
        canvasMode: true,
        comparisonMode: true,
        voiceInput: true,
        imageGeneration: true,
        codeExecution: true,
        autoRouter: true,
      },
      proTier: {
        proModelsEnabled: false,
        tier1DailyProModelLimit: 1,
        tier2MonthlyProModelLimit: 50,
      },
      search: {
        hybridEnabled: true,
        rrfK: 60,
        maxResults: 20,
        embeddingsEnabled: true,
      },
      memory: {
        maxMemoriesPerUser: 1000,
        autoExtractionEnabled: true,
        consolidationIntervalDays: 30,
        extractEveryNMessages: 5,
      },
      transcriptProvider: { provider: "groq", costPerMinute: 0.0067 },
    } as unknown as Awaited<ReturnType<typeof getAdminSettings>>);

    const { GET } = await import("../admin/settings/route");
    const res = await GET(
      makeReq("http://t/api/v1/admin/settings"),
      routeContext,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.data?.limits.defaultMonthlyBudget).toBe(10);
  });

  it("GET requires admin (403 for non-admin)", async () => {
    const { GET } = await import("../admin/settings/route");
    const res = await GET(
      makeReq("http://t/api/v1/admin/settings", { isAdmin: false }),
      routeContext,
    );
    expect(res.status).toBe(403);
  });

  it("PATCH validates body and persists", async () => {
    adminUpdateMock.mockResolvedValue({
      limits: {
        defaultMonthlyBudget: 20,
        defaultBudgetAlertThreshold: 0.8,
        budgetHardLimitEnabled: true,
        defaultDailyMessageLimit: 50,
        defaultMaxIntegrations: 5,
      },
    } as unknown as Awaited<ReturnType<typeof updateAdminSettings>>);
    const { PATCH } = await import("../admin/settings/route");
    const res = await PATCH(
      makeReq("http://t/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ limits: { defaultMonthlyBudget: 20 } }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(adminUpdateMock).toHaveBeenCalledWith("admin_user_1", {
      limits: { defaultMonthlyBudget: 20 },
    });
  });

  it("PATCH rejects unknown top-level keys (zod strict)", async () => {
    const { PATCH } = await import("../admin/settings/route");
    const res = await PATCH(
      makeReq("http://t/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ totallyMadeUp: 1 }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    // withErrorHandling turns a thrown ZodError into a 4xx response.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(adminUpdateMock).not.toHaveBeenCalled();
  });
});

describe("/api/v1/admin/auto-router/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns merged config", async () => {
    routerMock.mockResolvedValue({
      contextBuffer: 1.2,
      longContextThreshold: 128_000,
      classifierConfidenceThreshold: 0.82,
      classifierTopK: 5,
      classifierFallbackEnabled: true,
    });
    const { GET } = await import("../admin/auto-router/config/route");
    const res = await GET(
      makeReq("http://t/api/v1/admin/auto-router/config"),
      routeContext,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.classifierTopK).toBe(5);
  });

  it("PATCH persists classifier override", async () => {
    routerUpdateMock.mockResolvedValue({
      contextBuffer: 1.2,
      longContextThreshold: 128_000,
      classifierConfidenceThreshold: 0.9,
      classifierTopK: 5,
      classifierFallbackEnabled: true,
    });
    const { PATCH } = await import("../admin/auto-router/config/route");
    const res = await PATCH(
      makeReq("http://t/api/v1/admin/auto-router/config", {
        method: "PATCH",
        body: JSON.stringify({ classifierConfidenceThreshold: 0.9 }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(routerUpdateMock).toHaveBeenCalledWith("admin_user_1", {
      classifierConfidenceThreshold: 0.9,
    });
  });

  it("PATCH rejects out-of-range threshold (zod min/max)", async () => {
    const { PATCH } = await import("../admin/auto-router/config/route");
    const res = await PATCH(
      makeReq("http://t/api/v1/admin/auto-router/config", {
        method: "PATCH",
        body: JSON.stringify({ classifierConfidenceThreshold: 1.5 }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(routerUpdateMock).not.toHaveBeenCalled();
  });

  it("PATCH requires admin (403 for non-admin)", async () => {
    const { PATCH } = await import("../admin/auto-router/config/route");
    const res = await PATCH(
      makeReq("http://t/api/v1/admin/auto-router/config", {
        method: "PATCH",
        body: JSON.stringify({ classifierTopK: 7 }),
        headers: { "Content-Type": "application/json" },
        isAdmin: false,
      }),
      routeContext,
    );
    expect(res.status).toBe(403);
    expect(routerUpdateMock).not.toHaveBeenCalled();
  });
});
