import { describe, expect, it } from "vitest";
import { IdMap } from "../id-map";
import type { ConvexMemory } from "../types";
import { transformMemory } from "./memories";

describe("transformMemory", () => {
  it("maps core fields and formats embedding", () => {
    const idMap = new IdMap();
    const doc: ConvexMemory = {
      _id: "mem1",
      _creationTime: 1700000000000,
      userId: "user1",
      content: "User prefers dark mode",
      embedding: [0.1, 0.2, 0.3],
      metadata: { category: "preference", importance: 8 },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformMemory(doc, idMap);
    expect(result.content).toBe("User prefers dark mode");
    expect(result.category).toBe("preference");
    expect(result.embedding).toBe("[0.1,0.2,0.3]");
    expect((result.metadata as Record<string, unknown>).importance).toBe(8);
  });

  it("drops cognitive fields (memoryType, stability, etc)", () => {
    const idMap = new IdMap();
    const doc: ConvexMemory = {
      _id: "mem2",
      _creationTime: 1700000000000,
      userId: "user1",
      content: "Some memory",
      embedding: [0.5],
      metadata: { category: "episodic" },
      memoryType: "episodic",
      stability: 0.8,
      accessCount: 5,
      retention: 0.9,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformMemory(doc, idMap);
    expect(result).not.toHaveProperty("memoryType");
    expect(result).not.toHaveProperty("stability");
    expect(result).not.toHaveProperty("accessCount");
    expect(result).not.toHaveProperty("retention");
  });

  it("maps optional conversationId and sourceMessageId via idMap", () => {
    const idMap = new IdMap();
    const doc: ConvexMemory = {
      _id: "mem3",
      _creationTime: 1700000000000,
      userId: "user1",
      conversationId: "conv1",
      sourceMessageId: "msg1",
      content: "Context memory",
      embedding: [0.1],
      metadata: { category: "fact" },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformMemory(doc, idMap);
    expect(result.conversationId).toBe(idMap.get("conversations", "conv1"));
    expect(result.sourceMessageId).toBe(idMap.get("messages", "msg1"));
  });

  it("sets optional IDs to null when absent", () => {
    const idMap = new IdMap();
    const doc: ConvexMemory = {
      _id: "mem4",
      _creationTime: 1700000000000,
      userId: "user1",
      content: "Standalone memory",
      embedding: [0.5],
      metadata: { category: "preference" },
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const result = transformMemory(doc, idMap);
    expect(result.conversationId).toBeNull();
    expect(result.sourceMessageId).toBeNull();
  });
});
