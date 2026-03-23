/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const authMock = vi.fn();
const triggerTaskMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
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

    authMock.mockResolvedValue({
      userId: "clerk_image",
      getToken: vi.fn(async () => null),
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
    expect(
      unwrapData<{
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
      ),
    ).toMatchObject({
      jobId: "run_image_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_image_123",
    });

    expect(triggerTaskMock).toHaveBeenCalledWith("generate-image", {
      conversationId: "conv_123",
      messageId: "msg_123",
      prompt: "Draw a repair bot replacing the Convex bridge with Trigger",
      model: "google:gemini-3-pro-image",
      thinkingEffort: "medium",
    });
  });
});
