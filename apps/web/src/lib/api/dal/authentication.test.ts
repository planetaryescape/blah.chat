// @vitest-environment node

import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationsDAL } from "./conversations";
import { messagesDAL } from "./messages";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api/convex", () => ({
  getAuthenticatedConvexClient: mocks.authenticated,
  getConvexClient: () => {
    throw new Error("Private DAL attempted anonymous access");
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticated.mockImplementation((token) => {
    if (token !== "user-jwt") throw new Error("Missing user JWT");
    return { query: mocks.query, mutation: mocks.mutation };
  });
  mocks.query.mockImplementation(async (ref) =>
    getFunctionName(ref) === "messages:list"
      ? []
      : {
          _id: "entity-id",
          conversationId: "conversation-id",
          content: "message",
        },
  );
  mocks.mutation.mockResolvedValue({
    userMessageId: "user-message",
    assistantMessageIds: ["assistant-message"],
  });
});

describe("private DAL authentication", () => {
  it("uses a fresh authenticated client for conversation reads and mutations", async () => {
    await conversationsDAL.getById("clerk-user", "conversation-id", "user-jwt");
    await conversationsDAL.update(
      "clerk-user",
      "conversation-id",
      { title: "title" },
      "user-jwt",
    );
    await conversationsDAL.archive("clerk-user", "conversation-id", "user-jwt");
    await conversationsDAL.delete("clerk-user", "conversation-id", "user-jwt");
    expect(
      mocks.authenticated.mock.calls.every(([token]) => token === "user-jwt"),
    ).toBe(true);
    expect(mocks.query).toHaveBeenCalled();
    expect(mocks.mutation).toHaveBeenCalled();
  });
  it("authenticates message send/list/poll/delete and polls the public authorized endpoint", async () => {
    await messagesDAL.send(
      "clerk-user",
      "conversation-id",
      { content: "hello" },
      "user-jwt",
    );
    await messagesDAL.list("clerk-user", "conversation-id", "user-jwt");
    await messagesDAL.get("clerk-user", "message-id", "user-jwt");
    await messagesDAL.delete("clerk-user", "message-id", "user-jwt");
    const paths = mocks.query.mock.calls.map(([ref]) => getFunctionName(ref));
    expect(paths).toContain("messages:getForCurrentUser");
    expect(paths).not.toContain("messages:get");
    expect(mocks.authenticated).toHaveBeenCalledWith("user-jwt");
  });
});
