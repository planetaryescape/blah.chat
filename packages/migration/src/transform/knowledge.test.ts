import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexKnowledgeChunk, ConvexKnowledgeSource } from "../types";
import { transformKnowledgeChunk, transformKnowledgeSource } from "./knowledge";

describe("transformKnowledgeSource", () => {
  it("maps core fields", () => {
    const idMap = new IdMap();
    const doc: ConvexKnowledgeSource = {
      _id: "ks1",
      _creationTime: 1700000000000,
      userId: "user1",
      type: "web",
      title: "Web Article",
      url: "https://example.com/article",
      status: "completed",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformKnowledgeSource(doc, idMap);
    expect(result.type).toBe("web");
    expect(result.url).toBe("https://example.com/article");
    expect(result.storageKey).toBeNull();
  });

  it("generates placeholder storageKey from storageId", () => {
    const idMap = new IdMap();
    const doc: ConvexKnowledgeSource = {
      _id: "ks2",
      _creationTime: 1700000000000,
      userId: "user1",
      type: "file",
      title: "PDF Doc",
      storageId: "storage_pdf123",
      status: "completed",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformKnowledgeSource(doc, idMap);
    expect(result.storageKey).toContain("storage_pdf123");
  });
});

describe("transformKnowledgeChunk", () => {
  it("maps core fields with embedding", () => {
    const idMap = new IdMap();
    const doc: ConvexKnowledgeChunk = {
      _id: "kc1",
      _creationTime: 1700000000000,
      sourceId: "ks1",
      userId: "user1",
      content: "Some chunk content",
      chunkIndex: 0,
      charOffset: 0,
      tokenCount: 50,
      embedding: [0.1, 0.2],
      createdAt: 1700000000000,
    };
    const result = transformKnowledgeChunk(doc, idMap);
    expect(result.sourceKey).toBe(idMap.get("knowledgeSources", "ks1"));
    expect(result.content).toBe("Some chunk content");
    expect(result.embedding).toBe("[0.1,0.2]");
  });

  it("sets embedding to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexKnowledgeChunk = {
      _id: "kc2",
      _creationTime: 1700000000000,
      sourceId: "ks1",
      userId: "user1",
      content: "No embedding chunk",
      chunkIndex: 1,
      charOffset: 100,
      tokenCount: 30,
      createdAt: 1700000000000,
    };
    const result = transformKnowledgeChunk(doc, idMap);
    expect(result.embedding).toBeNull();
    expect(result.chunkIndex).toBe(1);
  });
});
