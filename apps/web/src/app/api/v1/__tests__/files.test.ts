/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";

const filesDAL = {
  createUploadUrl: vi.fn(),
};

vi.mock("@/lib/api/dal/files", () => ({
  filesDAL,
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withUserAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_123",
      }),
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

describe("/api/v1/files/upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a signed upload url and storage id", async () => {
    filesDAL.createUploadUrl.mockResolvedValueOnce({
      status: "success",
      data: {
        uploadUrl: "https://example.com/upload",
        storageId: "users/u1/conversations/c1/test.png",
        method: "PUT",
      },
    });

    const { POST } = await import("../files/upload-url/route");
    const response = await POST(
      createMockRequest("/api/v1/files/upload-url", {
        method: "POST",
        body: {
          conversationId: "conv_1",
          fileName: "test.png",
          contentType: "image/png",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const data = unwrapData<{ uploadUrl: string; storageId: string }>(json);
    expect(data.storageId).toContain("test.png");
    expect(filesDAL.createUploadUrl).toHaveBeenCalledWith("user_123", {
      conversationId: "conv_1",
      fileName: "test.png",
      contentType: "image/png",
    });
  });
});
