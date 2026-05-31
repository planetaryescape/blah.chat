/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";

const ORIGINAL_E2B_API_KEY = process.env.E2B_API_KEY;
const ORIGINAL_INTERNAL_TASK_SECRET = process.env.INTERNAL_TASK_SECRET;
const INTERNAL_TASK_SECRET = "test-internal-secret";
const authMock = vi.fn();
const buildCodeExecutionObjectKeyMock = vi.fn(
  () =>
    "users/user_exec/conversations/conv_exec/tool-outputs/code-execution/plot.png",
);
const uploadObjectMock = vi.fn();
const sandboxCreateMock = vi.fn();
const sandboxKillMock = vi.fn();
const sandboxRunCodeMock = vi.fn();
const ensureCurrentPersistenceUserMock = vi.fn();
const findConversationMock = vi.fn();
const getLimiterMock = vi.fn();
const applyRateLimitMock = vi.fn();
const r2Client = { send: vi.fn() };

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-test",
    },
  }),
  getPersistenceR2Client: () => r2Client,
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
    buildCodeExecutionObjectKey: buildCodeExecutionObjectKeyMock,
    uploadObject: uploadObjectMock,
  };
});

vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    create: sandboxCreateMock,
  },
}));

describe("/api/code-execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.E2B_API_KEY = "e2b_test_key";
    process.env.INTERNAL_TASK_SECRET = INTERNAL_TASK_SECRET;
    authMock.mockResolvedValue({ userId: null });
    ensureCurrentPersistenceUserMock.mockResolvedValue({ id: "user_exec" });
    getLimiterMock.mockReturnValue(undefined);
    applyRateLimitMock.mockResolvedValue(null);
    findConversationMock.mockResolvedValue({
      id: "conv_exec",
      userId: "user_exec",
    });

    sandboxCreateMock.mockResolvedValue({
      runCode: sandboxRunCodeMock,
      kill: sandboxKillMock,
    });

    sandboxRunCodeMock.mockResolvedValue({
      logs: {
        stdout: ["plot ready"],
        stderr: [],
      },
      text: "done",
      results: [
        {
          png: Buffer.from("png-bytes").toString("base64"),
        },
      ],
    });
  });

  afterEach(() => {
    if (ORIGINAL_E2B_API_KEY === undefined) {
      delete process.env.E2B_API_KEY;
    } else {
      process.env.E2B_API_KEY = ORIGINAL_E2B_API_KEY;
    }

    if (ORIGINAL_INTERNAL_TASK_SECRET === undefined) {
      delete process.env.INTERNAL_TASK_SECRET;
    } else {
      process.env.INTERNAL_TASK_SECRET = ORIGINAL_INTERNAL_TASK_SECRET;
    }
  });

  it("rejects spoofed internal calls without the shared task secret", async () => {
    const { POST } = await import("../code-execution/route");
    const response = await POST(
      createMockRequest("/api/code-execution", {
        method: "POST",
        headers: {
          "X-Internal-Call": "true",
        },
        body: {
          code: "print('plot')",
          language: "python",
          userId: "user_exec",
          conversationId: "conv_exec",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(sandboxCreateMock).not.toHaveBeenCalled();
  });

  it("stores generated images for authorized internal execution", async () => {
    const { POST } = await import("../code-execution/route");
    const response = await POST(
      createMockRequest("/api/code-execution", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTERNAL_TASK_SECRET}`,
        },
        body: {
          code: "print('plot')",
          language: "python",
          timeout: 15,
          userId: "user_exec",
          conversationId: "conv_exec",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      language: "python",
      code: "print('plot')",
      stdout: "plot ready",
      stderr: "",
      result: "done",
      images: [
        {
          storageId:
            "users/user_exec/conversations/conv_exec/tool-outputs/code-execution/plot.png",
          url: "/api/v1/files/users/user_exec/conversations/conv_exec/tool-outputs/code-execution/plot.png",
        },
      ],
    });

    expect(buildCodeExecutionObjectKeyMock).toHaveBeenCalledWith({
      userId: "user_exec",
      conversationId: "conv_exec",
      fileName: "plot.png",
    });
    expect(uploadObjectMock).toHaveBeenCalledWith({
      client: r2Client,
      bucket: "blah-chat-test",
      key: "users/user_exec/conversations/conv_exec/tool-outputs/code-execution/plot.png",
      body: expect.any(Uint8Array),
      contentType: "image/png",
      cacheControl: "private, max-age=31536000, immutable",
    });
    expect(sandboxKillMock).toHaveBeenCalledTimes(1);
  });

  it("rejects authenticated image storage for conversations the user does not own", async () => {
    authMock.mockResolvedValue({ userId: "clerk_exec" });
    findConversationMock.mockResolvedValue(null);

    const { POST } = await import("../code-execution/route");
    const response = await POST(
      createMockRequest("/api/code-execution", {
        method: "POST",
        body: {
          code: "print('plot')",
          language: "python",
          userId: "other_user",
          conversationId: "conv_other",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(sandboxCreateMock).not.toHaveBeenCalled();
    expect(uploadObjectMock).not.toHaveBeenCalled();
  });

  it("rate limits authenticated execution before creating a sandbox", async () => {
    authMock.mockResolvedValue({ userId: "clerk_exec" });
    getLimiterMock.mockReturnValue({ limit: vi.fn() });
    applyRateLimitMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
      }),
    );

    const { POST } = await import("../code-execution/route");
    const response = await POST(
      createMockRequest("/api/code-execution", {
        method: "POST",
        body: {
          code: "print('plot')",
          language: "python",
        },
      }),
    );

    expect(response.status).toBe(429);
    expect(sandboxCreateMock).not.toHaveBeenCalled();
  });
});
