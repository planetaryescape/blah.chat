/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const authMock = vi.fn();
const triggerTaskMock = vi.fn();
const ensureCurrentPersistenceUserMock = vi.fn();
const getLimiterMock = vi.fn();
const applyRateLimitMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/persistence/current-user", () => ({
  ensureCurrentPersistenceUser: ensureCurrentPersistenceUserMock,
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

describe("transcribe auth with Clerk + Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    triggerTaskMock.mockResolvedValue({
      id: "run_transcribe_123",
    });
    getLimiterMock.mockReturnValue(undefined);
    applyRateLimitMock.mockResolvedValue(null);

    authMock.mockResolvedValue({
      userId: "clerk_transcribe",
      getToken: vi.fn(async () => null),
    });
    process.env.INTERNAL_TASK_SECRET = "test-action-job-secret";
    ensureCurrentPersistenceUserMock.mockResolvedValue({
      id: "user_transcribe",
    });
  });

  it("starts transcription through Trigger and returns a job envelope", async () => {
    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "users/user_transcribe/drafts/audio.webm",
          model: "whisper-1",
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
    expect(data.jobId).toMatch(/^run_transcribe_123\.[A-Za-z0-9_-]+$/);
    expect(data.pollUrl).toBe(`/api/v1/actions/jobs/${data.jobId}`);

    expect(triggerTaskMock).toHaveBeenCalledWith("transcribe", {
      userId: "user_transcribe",
      storageId: "users/user_transcribe/drafts/audio.webm",
      model: "whisper-1",
    });
  });

  it("accepts mimeType for the existing web upload/transcribe flow", async () => {
    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "users/user_transcribe/drafts/audio-2.webm",
          mimeType: "audio/webm",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(202);
    expect(triggerTaskMock).toHaveBeenCalledWith("transcribe", {
      userId: "user_transcribe",
      storageId: "users/user_transcribe/drafts/audio-2.webm",
      mimeType: "audio/webm",
    });
  });

  it("rejects transcription for storage outside the user's namespace", async () => {
    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "users/other_user/drafts/audio.webm",
          mimeType: "audio/webm",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(404);
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("rate-limits transcription before creating a Trigger job", async () => {
    const limiter = { limit: vi.fn() };
    getLimiterMock.mockReturnValue(limiter);
    applyRateLimitMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "error" }), { status: 429 }),
    );

    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "users/user_transcribe/drafts/audio.webm",
          mimeType: "audio/webm",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(429);
    expect(applyRateLimitMock).toHaveBeenCalledWith(
      limiter,
      "clerk_transcribe",
    );
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });
});
