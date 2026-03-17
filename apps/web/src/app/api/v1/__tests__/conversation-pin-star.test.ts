/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const togglePin = vi.fn();
const toggleStar = vi.fn();

vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: {
    togglePin,
    toggleStar,
  },
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth:
    (handler: (req: Request, context: any) => Promise<Response>) =>
    async (req: Request, context?: any) =>
      handler(req, {
        params: context?.params ?? Promise.resolve({}),
        userId: "user_1",
      }),
}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

import { createMockRequest } from "@/lib/test/api-helpers";

describe("/api/v1/conversations/[id]/pin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles pin through the conversation DAL", async () => {
    togglePin.mockResolvedValue({
      status: "success",
      sys: { entity: "conversation", id: "conv_1" },
      data: { _id: "conv_1", pinned: true },
    });

    const { POST } = await import("../conversations/[id]/pin/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_1/pin", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "conv_1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(togglePin).toHaveBeenCalledWith("user_1", "conv_1");
    expect(json.data.pinned).toBe(true);
  });
});

describe("/api/v1/conversations/[id]/star", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles star through the conversation DAL", async () => {
    toggleStar.mockResolvedValue({
      status: "success",
      sys: { entity: "conversation", id: "conv_1" },
      data: { _id: "conv_1", starred: true },
    });

    const { POST } = await import("../conversations/[id]/star/route");
    const response = await POST(
      createMockRequest("/api/v1/conversations/conv_1/star", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "conv_1" }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(toggleStar).toHaveBeenCalledWith("user_1", "conv_1");
    expect(json.data.starred).toBe(true);
  });
});
