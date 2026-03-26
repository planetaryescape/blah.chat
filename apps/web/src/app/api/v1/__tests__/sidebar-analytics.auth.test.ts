/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const captureMock = vi.fn(async () => undefined);
const shutdownMock = vi.fn(async () => undefined);

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = captureMock;
    shutdown = shutdownMock;
  },
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

describe("sidebar analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      userId: "clerk_sidebar",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_sidebar",
      primaryEmailAddress: { emailAddress: "sidebar@example.com" },
      fullName: "Sidebar User",
      firstName: "Sidebar",
      lastName: "User",
      imageUrl: "https://example.com/sidebar.png",
      publicMetadata: {},
    });

    process.env.POSTHOG_API_KEY = "ph_test_key";
    process.env.POSTHOG_HOST = "https://app.posthog.com";
  });

  it("tracks sidebar events through the rewrite-native analytics route", async () => {
    const route = await import("../analytics/sidebar/route");

    const response = await route.POST(
      createMockRequest("/api/v1/analytics/sidebar", {
        method: "POST",
        body: {
          event: "sidebar_select_conversation",
          metadata: {
            source: "drawer",
            projectId: "project_alpha",
          },
          resourceId: "conv_sidebar_1",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(
      unwrapData<{ captured: boolean }>((await response.json()) as any),
    ).toEqual({
      captured: true,
    });

    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "clerk_sidebar",
        event: "sidebar_select_conversation",
        properties: expect.objectContaining({
          resourceId: "conv_sidebar_1",
          source: "drawer",
          projectId: "project_alpha",
          platform: "mobile",
          surface: "sidebar",
        }),
      }),
    );
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });
});
