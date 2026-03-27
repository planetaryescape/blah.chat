import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexShare } from "../types";
import { transformShare } from "./shares";

describe("transformShare", () => {
  it("maps all fields with ID remapping", () => {
    const idMap = new IdMap();
    const doc: ConvexShare = {
      _id: "share1",
      _creationTime: 1700000000000,
      userId: "user1",
      conversationId: "conv1",
      shareId: "abc-def-123",
      title: "Shared Chat",
      isPublic: true,
      isActive: true,
      viewCount: 5,
      createdAt: 1700000000000,
    };
    const result = transformShare(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result.shareId).toBe("abc-def-123");
    expect(result.title).toBe("Shared Chat");
    expect(result.isPublic).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.viewCount).toBe(5);
    expect(result.createdAt).toBe(1700000000000);
  });

  it("defaults anonymizeUsernames to false when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexShare = {
      _id: "share2",
      _creationTime: 1700000000000,
      userId: "user1",
      conversationId: "conv1",
      shareId: "def-456",
      title: "Chat",
      isPublic: false,
      isActive: false,
      viewCount: 0,
      createdAt: 1700000000000,
    };
    const result = transformShare(doc, idMap);
    expect(result.anonymizeUsernames).toBe(false);
  });

  it("sets password to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexShare = {
      _id: "share3",
      _creationTime: 1700000000000,
      userId: "user1",
      conversationId: "conv1",
      shareId: "ghi-789",
      title: "Chat",
      isPublic: true,
      isActive: true,
      viewCount: 0,
      createdAt: 1700000000000,
    };
    const result = transformShare(doc, idMap);
    expect(result.password).toBeNull();
  });

  it("maps expiresAt when present", () => {
    const idMap = new IdMap();
    const doc: ConvexShare = {
      _id: "share4",
      _creationTime: 1700000000000,
      userId: "user1",
      conversationId: "conv1",
      shareId: "jkl-012",
      title: "Expiring",
      isPublic: true,
      isActive: true,
      viewCount: 0,
      expiresAt: 1700086400000,
      createdAt: 1700000000000,
    };
    const result = transformShare(doc, idMap);
    expect(result.expiresAt).toBe(1700086400000);
  });
});
