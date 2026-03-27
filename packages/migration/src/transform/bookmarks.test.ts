import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexBookmark } from "../types";
import { transformBookmark } from "./bookmarks";

describe("transformBookmark", () => {
  it("maps all fields with ID remapping", () => {
    const idMap = new IdMap();
    const doc: ConvexBookmark = {
      _id: "bm1",
      _creationTime: 1700000000000,
      userId: "user1",
      messageId: "msg1",
      conversationId: "conv1",
      note: "Important point",
      tags: ["review", "later"],
      createdAt: 1700000000000,
    };

    const result = transformBookmark(doc, idMap);
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.messageId).toBe(idMap.get("messages", "msg1"));
    expect(result.note).toBe("Important point");
    expect(result.tags).toEqual(["review", "later"]);
  });

  it("defaults tags to empty array when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexBookmark = {
      _id: "bm2",
      _creationTime: 1700000000000,
      userId: "user1",
      messageId: "msg1",
      conversationId: "conv1",
      createdAt: 1700000000000,
    };

    const result = transformBookmark(doc, idMap);
    expect(result.tags).toEqual([]);
    expect(result.note).toBeNull();
  });

  it("uses createdAt for updatedAt (Convex has no updatedAt)", () => {
    const idMap = new IdMap();
    const doc: ConvexBookmark = {
      _id: "bm3",
      _creationTime: 1700000000000,
      userId: "user1",
      messageId: "msg1",
      conversationId: "conv1",
      createdAt: 1700000005000,
    };

    const result = transformBookmark(doc, idMap);
    expect(result.updatedAt).toBe(result.createdAt);
  });

  it("remaps conversationId via idMap", () => {
    const idMap = new IdMap();
    const doc: ConvexBookmark = {
      _id: "bm4",
      _creationTime: 1700000000000,
      userId: "user1",
      messageId: "msg1",
      conversationId: "conv99",
      createdAt: 1700000000000,
    };
    const result = transformBookmark(doc, idMap);
    expect(result.conversationId).toBe(idMap.get("conversations", "conv99"));
  });
});
