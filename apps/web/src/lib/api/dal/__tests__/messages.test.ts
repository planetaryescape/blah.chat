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
import { ConflictError, NotFoundError } from "@/lib/api/errors";
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

  it("maps an accepted send whose target disappeared to not found", async () => {
    mockConvex.mutation.mockRejectedValue(
      new ConvexError({
        code: "CHAT_SEND_NOT_FOUND",
        message: "Accepted send is no longer available",
      }),
    );

    await expect(
      messagesDAL.send(
        "clerk-user",
        "conversation-1",
        { content: "retry", clientMessageId: "stable-key" },
        "session-token",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the standard entity envelope and retains async metadata", async () => {
    mockConvex.mutation.mockResolvedValue({
      conversationId: "conversation-1",
      userMessageId: "user-message",
      assistantMessageIds: ["assistant-message"],
    });

    await expect(
      messagesDAL.send(
        "clerk-user",
        "conversation-1",
        { content: "send", clientMessageId: "stable-key" },
        "session-token",
      ),
    ).resolves.toMatchObject({
      status: "success",
      sys: { entity: "message", async: true },
      data: {
        conversationId: "conversation-1",
        messageId: "user-message",
        assistantMessageId: "assistant-message",
        status: "pending",
        pollUrl: "/api/v1/messages/assistant-message",
      },
    });
  });

  it("returns not found when the target is missing or inaccessible", async () => {
    mockConvex.query.mockResolvedValue(null);

    await expect(
      messagesDAL.send(
        "clerk-user",
        "deleted-conversation",
        { content: "retry", clientMessageId: "stable-key" },
        "session-token",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mockConvex.mutation).not.toHaveBeenCalled();
  });
});
