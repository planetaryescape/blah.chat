import type { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import {
  ConvexAdapter,
  type ConvexAdapterFunctions,
} from "../../src/adapters/convex";

function ref(
  type: "query" | "mutation" | "action",
): FunctionReference<typeof type, "public", Record<string, unknown>, unknown> {
  return {
    _type: type,
    _visibility: "public",
    _args: {},
    _returnType: undefined,
    _componentPath: undefined,
  };
}

function makeClient() {
  return {
    mutation: vi.fn(),
    query: vi.fn(),
    action: vi.fn(),
  } as unknown as ConvexClient; // Test double
}

describe("ConvexAdapter", () => {
  test("createMemory maps importance 0-1 to metadata.importance 1-10 scale", async () => {
    const client = makeClient();
    client.mutation.mockResolvedValue("mid");

    const fns: ConvexAdapterFunctions = {
      createCognitiveMemory: ref("mutation"),
      updateCognitiveMemory: ref("mutation"),
      deleteCognitiveMemory: ref("mutation"),
      deleteCognitiveMemories: ref("mutation"),
      getCognitiveMemory: ref("query"),
      getCognitiveMemories: ref("query"),
      queryCognitiveMemories: ref("query"),
      findFadingMemories: ref("query"),
      findStableMemories: ref("query"),
      markSuperseded: ref("mutation"),
      batchUpdateRetention: ref("mutation"),
      cognitiveVectorSearch: ref("action"),
      createOrStrengthenLink: ref("mutation"),
      getLinkedMemories: ref("query"),
      getLinkedMemoriesMultiple: ref("query"),
      deleteLink: ref("mutation"),
    } as unknown as ConvexAdapterFunctions; // Test wiring

    const adapter = new ConvexAdapter({ client, functions: fns });

    await adapter.createMemory({
      userId: "u1",
      content: "x",
      embedding: [0, 1],
      memoryType: "semantic",
      importance: 0.7,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
      metadata: { category: "identity" },
    });

    const args = client.mutation.mock.calls[0][1];
    expect(args.metadata.importance).toBeCloseTo(7, 8);
  });

  test("getMemory normalizes metadata.importance back to 0-1", async () => {
    const client = makeClient();
    client.query.mockResolvedValue({
      _id: "m1",
      userId: "u1",
      content: "x",
      embedding: [0, 1],
      metadata: { category: "identity", importance: 8 },
      memoryType: "semantic",
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 0.9,
      createdAt: 1,
      updatedAt: 1,
    });

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    const m = await adapter.getMemory("m1");
    expect(m?.importance).toBeCloseTo(0.8, 8);
  });

  test("vectorSearch maps relevanceScore + finalScore", async () => {
    const client = makeClient();
    client.action.mockResolvedValue([
      {
        memory: {
          _id: "m1",
          userId: "u1",
          content: "x",
          embedding: [0, 1],
          metadata: { category: "identity", importance: 5 },
          memoryType: "semantic",
          stability: 0.3,
          accessCount: 0,
          lastAccessed: 1,
          retention: 0.5,
          createdAt: 1,
          updatedAt: 1,
        },
        relevanceScore: 0.9,
      },
    ]);

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    const results = await adapter.vectorSearch([0, 1], {
      userId: "u1",
      limit: 1,
    });
    expect(results[0].relevanceScore).toBeCloseTo(0.9, 8);
    expect(results[0].finalScore).toBeCloseTo(0.45, 8);
  });

  test("updateMemory maps importance 0-1 to 1-10", async () => {
    const client = makeClient();
    client.mutation.mockResolvedValue(null);

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    await adapter.updateMemory("m1", { importance: 0.2, stability: 0.9 });
    const args = client.mutation.mock.calls[0][1];
    expect(args.importance).toBeCloseTo(2, 8);
    expect(args.stability).toBe(0.9);
  });

  test("getLinkedMemories maps strength to linkStrength", async () => {
    const client = makeClient();
    client.query.mockResolvedValue([
      {
        memory: {
          _id: "m1",
          userId: "u1",
          content: "x",
          embedding: [0, 1],
          metadata: { category: "identity", importance: 5 },
          memoryType: "semantic",
          stability: 0.3,
          accessCount: 0,
          lastAccessed: 1,
          retention: 0.5,
          createdAt: 1,
          updatedAt: 1,
        },
        strength: 0.7,
      },
    ]);

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    const linked = await adapter.getLinkedMemories("m0", 0.3);
    expect(linked[0].linkStrength).toBeCloseTo(0.7, 8);
  });

  test("deleteMemory/deleteMemories call mutations", async () => {
    const client = makeClient();
    client.mutation.mockResolvedValue(null);
    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    await adapter.deleteMemory("m1");
    await adapter.deleteMemories(["m1", "m2"]);
    expect(client.mutation).toHaveBeenCalledTimes(2);
  });

  test("createOrStrengthenLink/deleteLink call mutations", async () => {
    const client = makeClient();
    client.mutation.mockResolvedValue(null);
    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    await adapter.createOrStrengthenLink("a", "b", 0.1);
    await adapter.deleteLink("a", "b");
    expect(client.mutation).toHaveBeenCalledTimes(2);
  });

  test("getMemories/queryMemories map arrays", async () => {
    const client = makeClient();
    client.query.mockResolvedValue([
      {
        _id: "m1",
        userId: "u1",
        content: "x",
        embedding: [0, 1],
        metadata: { category: "identity", importance: 5 },
        createdAt: 1,
        updatedAt: 1,
      },
    ]);

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    const ms = await adapter.getMemories(["m1"]);
    expect(ms.length).toBe(1);
    const qs = await adapter.queryMemories({ userId: "u1", limit: 10 });
    expect(qs.length).toBe(1);
  });

  test("updateRetentionScores batches updates", async () => {
    const client = makeClient();
    client.mutation.mockResolvedValue(null);
    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    await adapter.updateRetentionScores(new Map([["m1", 0.1]]));
    const args = client.mutation.mock.calls[0][1];
    expect(args.updates[0].retention).toBe(0.1);
  });

  test("handles null/non-array responses gracefully", async () => {
    const client = makeClient();
    client.query.mockResolvedValueOnce(null);
    client.query.mockResolvedValueOnce({ nope: true });
    client.action.mockResolvedValueOnce({ nope: true });

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    expect(await adapter.getMemory("m1")).toBeNull();
    expect(await adapter.getMemories(["m1"])).toEqual([]);
    expect(
      await adapter.vectorSearch([0, 1], { userId: "u1", limit: 1 }),
    ).toEqual([]);
  });

  test("convexToMemory returns null on missing required fields", async () => {
    const client = makeClient();
    client.query.mockResolvedValue({ _id: "m1" });

    const adapter = new ConvexAdapter({
      client,
      functions: {
        createCognitiveMemory: ref("mutation"),
        updateCognitiveMemory: ref("mutation"),
        deleteCognitiveMemory: ref("mutation"),
        deleteCognitiveMemories: ref("mutation"),
        getCognitiveMemory: ref("query"),
        getCognitiveMemories: ref("query"),
        queryCognitiveMemories: ref("query"),
        findFadingMemories: ref("query"),
        findStableMemories: ref("query"),
        markSuperseded: ref("mutation"),
        batchUpdateRetention: ref("mutation"),
        cognitiveVectorSearch: ref("action"),
        createOrStrengthenLink: ref("mutation"),
        getLinkedMemories: ref("query"),
        getLinkedMemoriesMultiple: ref("query"),
        deleteLink: ref("mutation"),
      },
    });

    expect(await adapter.getMemory("m1")).toBeNull();
  });
});
