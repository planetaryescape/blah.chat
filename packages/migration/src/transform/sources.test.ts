import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexSource, ConvexSourceMetadata } from "../types";
import { transformSource, transformSourceMetadata } from "./sources";

describe("transformSourceMetadata", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const doc: ConvexSourceMetadata = {
      _id: "sm1",
      _creationTime: 1700000000000,
      urlHash: "abc123hash",
      url: "https://example.com",
      title: "Example",
      enriched: true,
      firstSeenAt: 1700000000000,
      lastAccessedAt: 1700000001000,
      accessCount: 3,
    };

    const result = transformSourceMetadata(doc, idMap);
    expect(result.urlHash).toBe("abc123hash");
    expect(result.url).toBe("https://example.com");
    expect(result.title).toBe("Example");
    expect(result.enriched).toBe(true);
    expect(result.accessCount).toBe(3);
  });

  it("maps optional OG fields to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexSourceMetadata = {
      _id: "sm2",
      _creationTime: 1700000000000,
      urlHash: "hash2",
      url: "https://example.com",
      enriched: false,
      firstSeenAt: 1700000000000,
      lastAccessedAt: 1700000000000,
      accessCount: 0,
    };

    const result = transformSourceMetadata(doc, idMap);
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.ogImage).toBeNull();
    expect(result.favicon).toBeNull();
    expect(result.siteName).toBeNull();
  });

  it("maps enrichmentError to error field", () => {
    const idMap = new IdMap();
    const doc: ConvexSourceMetadata = {
      _id: "sm3",
      _creationTime: 1700000000000,
      urlHash: "hash3",
      url: "https://example.com",
      enriched: false,
      enrichmentError: "fetch timeout",
      firstSeenAt: 1700000000000,
      lastAccessedAt: 1700000000000,
      accessCount: 0,
    };

    const result = transformSourceMetadata(doc, idMap);
    expect(result.error).toBe("fetch timeout");
  });
});

describe("transformSource", () => {
  it("maps all fields with ID remapping", () => {
    const idMap = new IdMap();
    const doc: ConvexSource = {
      _id: "src1",
      _creationTime: 1700000000000,
      messageId: "msg1",
      conversationId: "conv1",
      userId: "user1",
      position: 1,
      provider: "perplexity",
      title: "Source Title",
      snippet: "Some snippet",
      urlHash: "hash1",
      url: "https://example.com",
      isPartial: false,
      createdAt: 1700000000000,
    };

    const result = transformSource(doc, idMap);
    expect(result.messageId).toBe(idMap.get("messages", "msg1"));
    expect(result.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result.userId).toBe(idMap.get("users", "user1"));
    expect(result.position).toBe(1);
    expect(result.provider).toBe("perplexity");
    expect(result.title).toBe("Source Title");
    expect(result.snippet).toBe("Some snippet");
    expect(result.isPartial).toBe(false);
  });

  it("sets optional fields to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexSource = {
      _id: "src2",
      _creationTime: 1700000000000,
      messageId: "msg1",
      conversationId: "conv1",
      userId: "user1",
      position: 0,
      provider: "exa",
      urlHash: "hash2",
      url: "https://example.com/2",
      isPartial: true,
      createdAt: 1700000000000,
    };
    const result = transformSource(doc, idMap);
    expect(result.title).toBe("");
    expect(result.snippet).toBeNull();
    expect(result.isPartial).toBe(true);
  });
});
