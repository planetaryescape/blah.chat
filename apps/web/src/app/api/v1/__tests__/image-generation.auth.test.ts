/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const authMock = vi.fn();
const triggerTaskMock = vi.fn();
const ensureCurrentPersistenceUserMock = vi.fn();
const findConversationMock = vi.fn();
const findMessageMock = vi.fn();
const getLimiterMock = vi.fn();
const applyRateLimitMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/persistence/current-user", () => ({
  ensureCurrentPersistenceUser: ensureCurrentPersistenceUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => ({
    query: {
      conversations: {
        findFirst: findConversationMock,
      },
      messages: {
        findFirst: findMessageMock,
      },
    },
  }),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  getLimiter: getLimiterMock,
  applyRateLimit: applyRateLimitMock,
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createTriggerClient: vi.fn(() => ({
      triggerTask: triggerTaskMock,
    })),
    parsePersistenceEnv: vi.fn(() => ({
      databaseUrl: "postgres://user:pass@host/db",
      redis: {
        restUrl: "https://example.upstash.io",
        restToken: "token",
      },
      r2: {
        accountId: "account123",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucket: "blah-chat-prod",
        endpoint: "https://account123.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: {
        secretKey: "tr_dev_123",
        apiUrl: "https://api.trigger.dev",
      },
    })),
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

describe("image generation auth with Clerk + Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    triggerTaskMock.mockResolvedValue({
      id: "run_image_123",
    });
    getLimiterMock.mockReturnValue(undefined);
    applyRateLimitMock.mockResolvedValue(null);

    authMock.mockResolvedValue({
      userId: "clerk_image",
      getToken: vi.fn(async () => null),
    });
    process.env.INTERNAL_TASK_SECRET = "test-action-job-secret";
    ensureCurrentPersistenceUserMock.mockResolvedValue({ id: "user_image" });
    findConversationMock.mockResolvedValue({
      id: "conv_123",
      userId: "user_image",
    });
    findMessageMock.mockResolvedValue({
      id: "msg_123",
      conversationId: "conv_123",
      userId: "user_image",
      role: "assistant",
    });
  });

  it("starts image generation through Trigger and returns a job envelope", async () => {
    const { POST } = await import("../actions/images/generate/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/images/generate", {
        method: "POST",
        body: {
          conversationId: "conv_123",
          messageId: "msg_123",
          prompt: "Draw a repair bot replacing the Convex bridge with Trigger",
          model: "google:gemini-3-pro-image",
          thinkingEffort: "medium",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(202);
    const data = unwrapData<{
      jobId: string;
      status: string;
      pollUrl: string;
    }>(
      (await response.json()) as {
        status: string;
        data?: {
          jobId: string;
          status: string;
          pollUrl: string;
        };
      },
    );
    expect(data).toMatchObject({
      status: "pending",
    });
    expect(data.jobId).toMatch(/^run_image_123\.[A-Za-z0-9_-]+$/);
    expect(data.pollUrl).toBe(`/api/v1/actions/jobs/${data.jobId}`);

    expect(triggerTaskMock).toHaveBeenCalledWith("generate-image", {
      userId: "user_image",
      conversationId: "conv_123",
      messageId: "msg_123",
      prompt: "Draw a repair bot replacing the Convex bridge with Trigger",
      model: "google:gemini-3-pro-image",
      thinkingEffort: "medium",
    });
  });

  it("rejects image generation for conversations the user does not own", async () => {
    findConversationMock.mockResolvedValue(null);

    const { POST } = await import("../actions/images/generate/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/images/generate", {
        method: "POST",
        body: {
          conversationId: "conv_other",
          messageId: "msg_123",
          prompt: "Draw a private attachment",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(404);
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("rejects reference images outside the user's storage namespace", async () => {
    const { POST } = await import("../actions/images/generate/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/images/generate", {
        method: "POST",
        body: {
          conversationId: "conv_123",
          messageId: "msg_123",
          prompt: "Use someone else's image",
          referenceImageStorageId: "users/other_user/uploads/private.png",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(404);
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("rate-limits image generation before creating a Trigger job", async () => {
    const limiter = { limit: vi.fn() };
    getLimiterMock.mockReturnValue(limiter);
    applyRateLimitMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "error" }), { status: 429 }),
    );

    const { POST } = await import("../actions/images/generate/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/images/generate", {
        method: "POST",
        body: {
          conversationId: "conv_123",
          messageId: "msg_123",
          prompt: "Draw a rate limit",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(429);
    expect(applyRateLimitMock).toHaveBeenCalledWith(limiter, "clerk_image");
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });
});
