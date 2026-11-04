/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConvex = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/convex", () => ({
  getAuthenticatedConvexClient: () => mockConvex,
}));

import { ConvexError } from "convex/values";
import { ConflictError } from "@/lib/api/errors";
import { messagesDAL } from "../messages";

describe("messagesDAL.send conflict mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvex.query.mockResolvedValue({ _id: "conversation-1" });
  });

  it("maps only the structured chat-send conflict to HTTP-layer 409", async () => {
    mockConvex.mutation.mockRejectedValue(
      new ConvexError({
        code: "CHAT_SEND_INTENT_CONFLICT",
        message: "This request key was already used for a different send.",
      }),
    );

    await expect(
      messagesDAL.send(
        "clerk-user",
        "conversation-1",
        { content: "changed", clientMessageId: "stable-key" },
        "session-token",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("does not turn unrelated Convex errors into conflicts", async () => {
    mockConvex.mutation.mockRejectedValue(
      new ConvexError({ code: "OTHER_FAILURE", message: "not a conflict" }),
    );

    await expect(
      messagesDAL.send(
        "clerk-user",
        "conversation-1",
        { content: "unchanged", clientMessageId: "stable-key" },
        "session-token",
      ),
    ).rejects.toMatchObject({ data: { code: "OTHER_FAILURE" } });
  });
});
