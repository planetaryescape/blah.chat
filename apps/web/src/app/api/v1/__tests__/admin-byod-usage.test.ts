/**
 * @vitest-environment node
 */

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api/dal/adminByod", () => ({
  adminByodDAL: {
    getStats: vi.fn(),
    listInstances: vi.fn(),
    healthCheck: vi.fn(),
    runMigrations: vi.fn(),
    sendNotifications: vi.fn(),
  },
}));

vi.mock("@/lib/api/dal/adminUsageAggregate", () => ({
  adminUsageDAL: {
    monthlyTotal: vi.fn(),
    dailySpend: vi.fn(),
    spendByModel: vi.fn(),
    conversationCosts: vi.fn(),
    costByFeature: vi.fn(),
    userCount: vi.fn(),
  },
}));

vi.mock("@/lib/api/dal/userAnalytics", () => ({
  userAnalyticsDAL: {
    summary: vi.fn(),
    streaks: vi.fn(),
  },
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
    withUserAuth:
      (handler: RouteHandler) => async (req: NextRequest, ctx: RouteContext) =>
        handler(req, {
          params: ctx.params,
          userId: "user_1",
        }),
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

import { adminByodDAL } from "@/lib/api/dal/adminByod";
import { adminUsageDAL } from "@/lib/api/dal/adminUsageAggregate";
import { userAnalyticsDAL } from "@/lib/api/dal/userAnalytics";

type RouteContext = { params: Promise<Record<string, string | string[]>> };
type AuthContext = RouteContext & { userId: string };
type RouteHandler = (req: NextRequest, ctx: AuthContext) => Promise<Response>;

const makeReq = (
  url: string,
  init?: RequestInit & { isAdmin?: boolean },
): NextRequest => {
  const headers = new Headers(init?.headers);
  if (init?.isAdmin === false) headers.set("x-test-is-admin", "false");
  return new Request(url, { ...init, headers }) as unknown as NextRequest;
};

const routeContext: RouteContext = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/v1/admin/byod/* routes", () => {
  it("GET /admin/byod/stats returns DAL stats and requires admin", async () => {
    vi.mocked(adminByodDAL.getStats).mockResolvedValue({
      status: "success",
      data: { totalInstances: 3, activeInstances: 2 },
    } as unknown as Awaited<ReturnType<typeof adminByodDAL.getStats>>);
    const { GET } = await import("../admin/byod/stats/route");
    const ok = await GET(
      makeReq("http://t/api/v1/admin/byod/stats"),
      routeContext,
    );
    expect(ok.status).toBe(200);
    const json = await ok.json();
    expect(json.data?.totalInstances).toBe(3);

    const denied = await GET(
      makeReq("http://t/api/v1/admin/byod/stats", { isAdmin: false }),
      routeContext,
    );
    expect(denied.status).toBe(403);
  });

  it("POST /admin/byod/health-check returns 202 with jobId", async () => {
    vi.mocked(adminByodDAL.healthCheck).mockResolvedValue({
      status: "success",
      data: { jobId: "health-abc", configId: "cfg_1", scope: "single" },
    } as unknown as Awaited<ReturnType<typeof adminByodDAL.healthCheck>>);
    const { POST } = await import("../admin/byod/health-check/route");
    const res = await POST(
      makeReq("http://t/api/v1/admin/byod/health-check", {
        method: "POST",
        body: JSON.stringify({ configId: "cfg_1" }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    expect(res.status).toBe(202);
    expect(adminByodDAL.healthCheck).toHaveBeenCalledWith({
      configId: "cfg_1",
    });
  });

  it("POST /admin/byod/send-notifications passes the body through to DAL", async () => {
    vi.mocked(adminByodDAL.sendNotifications).mockResolvedValue({
      status: "success",
      data: { attempted: 2, sent: 2, failed: 0, results: [] },
    } as unknown as Awaited<ReturnType<typeof adminByodDAL.sendNotifications>>);
    const { POST } = await import("../admin/byod/send-notifications/route");
    const res = await POST(
      makeReq("http://t/api/v1/admin/byod/send-notifications", {
        method: "POST",
        body: JSON.stringify({
          configIds: ["a", "b"],
          subject: "Maintenance",
          body: "Heads up",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(adminByodDAL.sendNotifications).toHaveBeenCalledWith({
      configIds: ["a", "b"],
      subject: "Maintenance",
      body: "Heads up",
    });
  });
});

describe("/api/v1/admin/usage/* routes", () => {
  it("GET /admin/usage/monthly-total proxies DAL", async () => {
    vi.mocked(adminUsageDAL.monthlyTotal).mockResolvedValue({
      status: "success",
      data: { month: "2026-05", cost: 12.5 },
    } as unknown as Awaited<ReturnType<typeof adminUsageDAL.monthlyTotal>>);
    const { GET } = await import("../admin/usage/monthly-total/route");
    const res = await GET(
      makeReq("http://t/api/v1/admin/usage/monthly-total"),
      routeContext,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data?.cost).toBe(12.5);
  });

  it("GET /admin/usage/daily-spend forwards days param", async () => {
    vi.mocked(adminUsageDAL.dailySpend).mockResolvedValue({
      status: "success",
      data: [],
    } as unknown as Awaited<ReturnType<typeof adminUsageDAL.dailySpend>>);
    const { GET } = await import("../admin/usage/daily-spend/route");
    const res = await GET(
      makeReq("http://t/api/v1/admin/usage/daily-spend?days=14"),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(adminUsageDAL.dailySpend).toHaveBeenCalledWith({ days: "14" });
  });

  it("GET /admin/usage/cost-by-feature forwards date range", async () => {
    vi.mocked(adminUsageDAL.costByFeature).mockResolvedValue({
      status: "success",
      data: {},
    } as unknown as Awaited<ReturnType<typeof adminUsageDAL.costByFeature>>);
    const { GET } = await import("../admin/usage/cost-by-feature/route");
    const res = await GET(
      makeReq(
        "http://t/api/v1/admin/usage/cost-by-feature?startDate=2026-04-01&endDate=2026-04-30",
      ),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(adminUsageDAL.costByFeature).toHaveBeenCalledWith({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
  });
});

describe("/api/v1/usage/* (current user) routes", () => {
  it("GET /usage/summary scopes to caller userId", async () => {
    vi.mocked(userAnalyticsDAL.summary).mockResolvedValue({
      status: "success",
      data: { totalCost: 1 },
    } as unknown as Awaited<ReturnType<typeof userAnalyticsDAL.summary>>);
    const { GET } = await import("../usage/summary/route");
    const res = await GET(
      makeReq("http://t/api/v1/usage/summary"),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(userAnalyticsDAL.summary).toHaveBeenCalledWith("user_1", {
      startDate: undefined,
      endDate: undefined,
    });
  });

  it("GET /usage/streaks scopes to caller userId", async () => {
    vi.mocked(userAnalyticsDAL.streaks).mockResolvedValue({
      status: "success",
      data: { current: 3, longest: 7 },
    } as unknown as Awaited<ReturnType<typeof userAnalyticsDAL.streaks>>);
    const { GET } = await import("../usage/streaks/route");
    const res = await GET(
      makeReq("http://t/api/v1/usage/streaks"),
      routeContext,
    );
    expect(res.status).toBe(200);
    expect(userAnalyticsDAL.streaks).toHaveBeenCalledWith("user_1");
  });
});
