import { describe, expect, test } from "vitest";
import {
  getConvexConversationIdFromPath,
  isConvexConversationId,
  isConvexMessageId,
} from "../chatRouteIds";

describe("getConvexConversationIdFromPath", () => {
  test("returns a convex-style conversation id from chat routes", () => {
    expect(getConvexConversationIdFromPath("/chat/abc123def456")).toBe(
      "abc123def456",
    );
  });

  test("rejects postgres rewrite conversation ids", () => {
    expect(
      getConvexConversationIdFromPath("/chat/X4Lp_jUFvzTLE9-QyZPW_"),
    ).toBeNull();
  });

  test("returns null for non-chat paths", () => {
    expect(getConvexConversationIdFromPath("/search")).toBeNull();
  });
});

describe("isConvexConversationId", () => {
  test("accepts lowercase convex ids", () => {
    expect(isConvexConversationId("abc123def456")).toBe(true);
  });

  test("rejects postgres rewrite ids", () => {
    expect(isConvexConversationId("X4Lp_jUFvzTLE9-QyZPW_")).toBe(false);
  });
});

describe("isConvexMessageId", () => {
  test("accepts lowercase convex ids", () => {
    expect(isConvexMessageId("msg123abc456")).toBe(true);
  });

  test("rejects postgres rewrite ids", () => {
    expect(isConvexMessageId("Xjtnpfv9cM_HkeEKc9OjL")).toBe(false);
  });
});
