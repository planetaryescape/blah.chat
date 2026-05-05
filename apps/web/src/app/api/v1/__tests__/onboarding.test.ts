/**
 * @vitest-environment node
 */
import { createUserRepository } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

interface OnboardingShape {
  userId: string;
  tourCompleted: boolean;
  tourSkipped: boolean;
  tourCompletedAt?: number | null;
  autoRouterPreferenceSet: boolean;
  flags: Record<string, unknown>;
}

describe("onboarding routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_onboarding",
      email: "onboarding@example.com",
      name: "Onboarding Tester",
    });
    authMock.mockResolvedValue({
      userId: "clerk_onboarding",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_onboarding",
      primaryEmailAddress: { emailAddress: "onboarding@example.com" },
      fullName: "Onboarding Tester",
      firstName: "Onboarding",
      lastName: "Tester",
      imageUrl: null,
    });
  });

  it("GET creates a default onboarding row on first call", async () => {
    const { GET } = await import("../onboarding/route");
    const response = await GET(createMockRequest("/api/v1/onboarding"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: OnboardingShape;
    };
    const data = unwrapData<OnboardingShape>(json);
    expect(data.tourCompleted).toBe(false);
    expect(data.tourSkipped).toBe(false);
    expect(data.autoRouterPreferenceSet).toBe(false);
  });

  it("PATCH updates flags and stamps tourCompletedAt when completed flips true", async () => {
    const { PATCH } = await import("../onboarding/route");
    const response = await PATCH(
      createMockRequest("/api/v1/onboarding", {
        method: "PATCH",
        body: { tourCompleted: true, autoRouterPreferenceSet: true },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: OnboardingShape;
    };
    const data = unwrapData<OnboardingShape>(json);
    expect(data.tourCompleted).toBe(true);
    expect(data.autoRouterPreferenceSet).toBe(true);
    expect(data.tourCompletedAt).toBeGreaterThan(0);
  });

  it("PATCH rejects empty body with 400", async () => {
    const { PATCH } = await import("../onboarding/route");
    const response = await PATCH(
      createMockRequest("/api/v1/onboarding", {
        method: "PATCH",
        body: {},
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("POST /reset clears tour flags but preserves autoRouterPreferenceSet", async () => {
    const { PATCH } = await import("../onboarding/route");
    await PATCH(
      createMockRequest("/api/v1/onboarding", {
        method: "PATCH",
        body: {
          tourCompleted: true,
          autoRouterPreferenceSet: true,
        },
      }),
      { params: Promise.resolve({}) },
    );

    const { POST } = await import("../onboarding/reset/route");
    const response = await POST(
      createMockRequest("/api/v1/onboarding/reset", { method: "POST" }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      status: string;
      data?: OnboardingShape;
    };
    const data = unwrapData<OnboardingShape>(json);
    expect(data.tourCompleted).toBe(false);
    expect(data.tourSkipped).toBe(false);
    expect(data.autoRouterPreferenceSet).toBe(true);
  });
});
