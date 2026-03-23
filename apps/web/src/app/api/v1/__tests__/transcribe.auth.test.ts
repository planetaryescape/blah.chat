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

describe("transcribe auth with Clerk + Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    triggerTaskMock.mockResolvedValue({
      id: "run_transcribe_123",
    });

    authMock.mockResolvedValue({
      userId: "clerk_transcribe",
      getToken: vi.fn(async () => null),
    });
  });

  it("starts transcription through Trigger and returns a job envelope", async () => {
    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "storage_123",
          model: "whisper-1",
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
      jobId: "run_transcribe_123",
      status: "pending",
      pollUrl: "/api/v1/actions/jobs/run_transcribe_123",
    });

    expect(triggerTaskMock).toHaveBeenCalledWith("transcribe", {
      storageId: "storage_123",
      model: "whisper-1",
    });
  });

  it("accepts mimeType for the existing web upload/transcribe flow", async () => {
    const { POST } = await import("../actions/transcribe/route");
    const response = await POST(
      createMockRequest("/api/v1/actions/transcribe", {
        method: "POST",
        body: {
          storageId: "storage_456",
          mimeType: "audio/webm",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(202);
    expect(triggerTaskMock).toHaveBeenCalledWith("transcribe", {
      storageId: "storage_456",
      mimeType: "audio/webm",
    });
  });
});
