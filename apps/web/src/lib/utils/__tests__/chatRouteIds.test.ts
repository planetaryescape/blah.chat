import { describe, expect, test } from "vitest";
import {
  getLegacyConversationIdFromPath,
  isLegacyConversationId,
  isLegacyDocumentId,
  isLegacyMessageId,
} from "../chatRouteIds";

describe("getLegacyConversationIdFromPath", () => {
  test("returns a legacy-style conversation id from chat routes", () => {
    expect(getLegacyConversationIdFromPath("/chat/abc123def456")).toBe(
      "abc123def456",
    );
  });

  test("rejects nanoid conversation ids", () => {
    expect(
      getLegacyConversationIdFromPath("/chat/X4Lp_jUFvzTLE9-QyZPW_"),
    ).toBeNull();
  });

  test("returns null for non-chat paths", () => {
    expect(getLegacyConversationIdFromPath("/search")).toBeNull();
  });
});

describe("isLegacyConversationId", () => {
  test("accepts lowercase legacy ids", () => {
    expect(isLegacyConversationId("abc123def456")).toBe(true);
  });

  test("rejects nanoid ids", () => {
    expect(isLegacyConversationId("X4Lp_jUFvzTLE9-QyZPW_")).toBe(false);
  });
});

describe("isLegacyMessageId", () => {
  test("accepts lowercase legacy ids", () => {
    expect(isLegacyMessageId("msg123abc456")).toBe(true);
  });

  test("rejects nanoid ids", () => {
    expect(isLegacyMessageId("Xjtnpfv9cM_HkeEKc9OjL")).toBe(false);
  });
});

describe("isLegacyDocumentId", () => {
  test("accepts lowercase alphanumeric strings", () => {
    expect(isLegacyDocumentId("abc123")).toBe(true);
  });

  test("rejects strings with special chars", () => {
    expect(isLegacyDocumentId("abc-123")).toBe(false);
    expect(isLegacyDocumentId("ABC123")).toBe(false);
  });

  test("rejects null/undefined", () => {
    expect(isLegacyDocumentId(null)).toBe(false);
    expect(isLegacyDocumentId(undefined)).toBe(false);
  });
});
