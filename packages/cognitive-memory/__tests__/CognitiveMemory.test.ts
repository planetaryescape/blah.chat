import { InMemoryAdapter } from "../src/adapters/in-memory";
import { CognitiveMemory } from "../src/core/CognitiveMemory";
import type { EmbeddingProvider, MemoryType } from "../src/core/types";

function providerFromMap(map: Map<string, number[]>): EmbeddingProvider {
  return {
    async embed(text: string) {
      const v = map.get(text);
      if (!v) throw new Error(`missing embedding for: ${text}`);
      return v;
    },
  };
}

describe("CognitiveMemory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("store() applies defaults", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([["a", [1, 0]]]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });

    const id = await memory.store({ content: "a" });
    const m = await adapter.getMemory(id);
    expect(m?.memoryType).toBe("semantic");
    expect(m?.importance).toBe(0.5);
    expect(m?.stability).toBe(0.3);
    expect(m?.accessCount).toBe(0);
    expect(m?.retention).toBe(1.0);
  });

  test("retrieve() scores by relevance * retention and strengthens memories + links", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([
      ["q", [1, 0]],
      ["A", [1, 0]],
      ["B", [1, 0]],
      ["C", [0, 1]],
    ]);

    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });

    const now = Date.now();
    const aId = await adapter.createMemory({
      userId: "u1",
      content: "A",
      embedding: embeddings.get("A")!,
      memoryType: "episodic" as MemoryType,
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: now - 1 * 24 * 60 * 60 * 1000,
      retention: 1,
    });
    const bId = await adapter.createMemory({
      userId: "u1",
      content: "B",
      embedding: embeddings.get("B")!,
      memoryType: "episodic" as MemoryType,
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: now - 30 * 24 * 60 * 60 * 1000,
      retention: 1,
    });
    const cId = await adapter.createMemory({
      userId: "u1",
      content: "C",
      embedding: embeddings.get("C")!,
      memoryType: "semantic" as MemoryType,
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: now - 1 * 24 * 60 * 60 * 1000,
      retention: 1,
    });

    await adapter.createOrStrengthenLink(aId, cId, 0.4);

    const results = await memory.retrieve({
      query: "q",
      limit: 3,
      includeAssociations: true,
    });
    expect(results[0].id).toBe(aId);
    expect(results.some((r) => r.id === cId)).toBe(true);

    const a = await adapter.getMemory(aId);
    expect(a?.accessCount).toBe(1);
    expect(a?.stability).toBeGreaterThan(0.5);

    const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    expect(adapter.links.get(key)).toBeCloseTo(0.1, 6);

    const keyAC = aId < cId ? `${aId}|${cId}` : `${cId}|${aId}`;
    expect(adapter.links.get(keyAC)).toBeCloseTo(0.5, 6);
  });

  test("get() strengthens a memory", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([["x", [1, 0]]]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });
    const id = await adapter.createMemory({
      userId: "u1",
      content: "x",
      embedding: embeddings.get("x")!,
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: Date.now() - 10_000,
      retention: 1,
    });
    await memory.get(id);
    const m = await adapter.getMemory(id);
    expect(m?.accessCount).toBe(1);
  });

  test("queryMemories() strengthens returned memories", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([["x", [1, 0]]]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });
    const id = await adapter.createMemory({
      userId: "u1",
      content: "x",
      embedding: embeddings.get("x")!,
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: Date.now() - 10_000,
      retention: 1,
    });

    await memory.queryMemories({ limit: 10 });
    const m = await adapter.getMemory(id);
    expect(m?.accessCount).toBe(1);
  });

  test("update() regenerates embedding", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([
      ["old", [1, 0]],
      ["new", [0, 1]],
    ]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });
    const id = await memory.store({ content: "old" });
    await memory.update(id, "new");
    const m = await adapter.getMemory(id);
    expect(m?.embedding).toEqual([0, 1]);
  });

  test("consolidate() compresses groups and deletes stale", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([
      ["s", [1, 0]],
      ["coffee a", [1, 0]],
      ["coffee b", [1, 0]],
      ["coffee c", [1, 0]],
      ["coffee d", [1, 0]],
      ["coffee e", [1, 0]],
    ]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: { embed: async () => [1, 0] },
      userId: "u1",
    });

    const now = Date.now();
    for (const c of [
      "coffee a",
      "coffee b",
      "coffee c",
      "coffee d",
      "coffee e",
    ]) {
      const id = await adapter.createMemory({
        userId: "u1",
        content: c,
        embedding: embeddings.get(c)!,
        memoryType: "semantic",
        importance: 0.5,
        stability: 0.3,
        accessCount: 0,
        lastAccessed: now - 200 * 24 * 60 * 60 * 1000,
        retention: 0.1,
      });
      expect(id).toBeTruthy();
    }

    const staleId = await adapter.createMemory({
      userId: "u1",
      content: "s",
      embedding: embeddings.get("s")!,
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: now - 200 * 24 * 60 * 60 * 1000,
      retention: 0.01,
    });

    const result = await memory.consolidate();
    expect(result.compressed.length).toBe(1);
    expect(result.deleted).toBe(1);
    expect(await adapter.getMemory(staleId)).toBeNull();
  });

  test("consolidate() refreshes retention before finding fading memories", async () => {
    const adapter = new InMemoryAdapter();
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: { embed: async () => [0, 0] },
      userId: "u1",
    });

    const id = await adapter.createMemory({
      userId: "u1",
      content: "x",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: Date.now() - 100 * 24 * 60 * 60 * 1000,
      retention: 1,
    });

    const result = await memory.consolidate();
    expect(result.decayed.map((d) => d.id)).toContain(id);
  });

  test("link() validates strength", async () => {
    const adapter = new InMemoryAdapter();
    const embeddings = new Map<string, number[]>([["x", [1, 0]]]);
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: providerFromMap(embeddings),
      userId: "u1",
    });
    await expect(memory.link("a", "b", 2)).rejects.toThrow(/Invalid strength/);
  });

  test("store() retries embedding up to 3 attempts", async () => {
    const adapter = new InMemoryAdapter();
    const embed = vi
      .fn<
        Parameters<EmbeddingProvider["embed"]>,
        ReturnType<EmbeddingProvider["embed"]>
      >()
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue([1, 0]);

    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: { embed },
      userId: "u1",
    });

    const p = memory.store({ content: "x" });
    await vi.runAllTimersAsync();
    await p;
    expect(embed).toHaveBeenCalledTimes(3);
  });

  test("store() fails after 3 embedding attempts", async () => {
    const adapter = new InMemoryAdapter();
    const embed = vi.fn().mockRejectedValue(new Error("down"));
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: { embed },
      userId: "u1",
    });

    const p = memory.store({ content: "x" });
    const ex = expect(p).rejects.toThrow(/Embedding failed/);
    await vi.runAllTimersAsync();
    await ex;
  });

  test("get() throws on invalid lastAccessed", async () => {
    const adapter = new InMemoryAdapter();
    const memory = new CognitiveMemory({
      adapter,
      embeddingProvider: { embed: async () => [1, 0] },
      userId: "u1",
    });

    const id = await adapter.createMemory({
      userId: "u1",
      content: "x",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.5,
      accessCount: 0,
      lastAccessed: Number.NaN,
      retention: 1,
    });

    await expect(memory.get(id)).rejects.toThrow(/Invalid lastAccessed/);
  });
});
