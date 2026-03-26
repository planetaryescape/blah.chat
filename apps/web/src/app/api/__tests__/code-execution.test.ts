/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";

const authMock = vi.fn();
const buildCodeExecutionObjectKeyMock = vi.fn(
  () =>
    "users/user_exec/conversations/conv_exec/tool-outputs/code-execution/plot.png",
);
const uploadObjectMock = vi.fn();
const sandboxCreateMock = vi.fn();
const sandboxKillMock = vi.fn();
const sandboxRunCodeMock = vi.fn();
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

  it("stores generated images in R2 and returns same-origin file urls", async () => {
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
});
