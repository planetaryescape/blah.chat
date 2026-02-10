import { MemoryAdapter, type MemoryFilters } from "../src/adapters/base";
import { CognitiveMemory } from "../src/core/CognitiveMemory";
import type {
  EmbeddingProvider,
  Memory,
  MemoryType,
  ScoredMemory,
} from "../src/core/types";
import { cosineSimilarity } from "../src/utils/embeddings";

class InMemoryAdapter extends MemoryAdapter {
  private seq = 0;
  memories = new Map<string, Memory>();
  links = new Map<string, number>(); // key: "a|b" canonical

  async transaction<T>(
    callback: (adapter: MemoryAdapter) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  async createMemory(
    memory: Omit<Memory, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const id = `m${++this.seq}`;
    const now = Date.now();
    this.memories.set(id, { ...memory, id, createdAt: now, updatedAt: now });
    return id;
  }

  async getMemory(id: string): Promise<Memory | null> {
    return this.memories.get(id) ?? null;
  }

  async getMemories(ids: string[]): Promise<Memory[]> {
    return ids.map((id) => this.memories.get(id)).filter(Boolean) as Memory[];
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const existing = this.memories.get(id);
    if (!existing) return;
    this.memories.set(id, { ...existing, ...updates });
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async deleteMemories(ids: string[]): Promise<void> {
    for (const id of ids) this.memories.delete(id);
  }

  async queryMemories(filters: MemoryFilters): Promise<Memory[]> {
    let items = Array.from(this.memories.values());
    if (filters.userId)
      items = items.filter((m) => m.userId === filters.userId);
    if (filters.memoryTypes)
      items = items.filter((m) => filters.memoryTypes!.includes(m.memoryType));
    if (filters.minRetention !== undefined)
      items = items.filter((m) => m.retention >= filters.minRetention!);
    if (filters.minImportance !== undefined)
      items = items.filter((m) => m.importance >= filters.minImportance!);
    if (filters.createdAfter !== undefined)
      items = items.filter((m) => m.createdAt >= filters.createdAfter!);
    if (filters.createdBefore !== undefined)
      items = items.filter((m) => m.createdAt <= filters.createdBefore!);
    if (filters.offset) items = items.slice(filters.offset);
    if (filters.limit) items = items.slice(0, filters.limit);
    return items;
  }

  async vectorSearch(
    embedding: number[],
    filters?: MemoryFilters,
  ): Promise<ScoredMemory[]> {
    const items = await this.queryMemories(filters ?? {});
    return items
      .map((m) => {
        const relevanceScore = cosineSimilarity(embedding, m.embedding);
        return {
          ...m,
          relevanceScore,
          finalScore: relevanceScore * m.retention,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, filters?.limit ?? 5);
  }

  async updateRetentionScores(updates: Map<string, number>): Promise<void> {
    for (const [id, retention] of updates.entries()) {
      const m = this.memories.get(id);
      if (!m) continue;
      this.memories.set(id, { ...m, retention });
    }
  }

  async createOrStrengthenLink(
    sourceId: string,
    targetId: string,
    strength: number,
  ): Promise<void> {
    const [a, b] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    const key = `${a}|${b}`;
    const existing = this.links.get(key) ?? 0;
    this.links.set(key, Math.min(1, existing + strength));
  }

  async getLinkedMemories(
    memoryId: string,
    minStrength: number = 0.3,
  ): Promise<Array<Memory & { linkStrength: number }>> {
    return this.getLinkedMemoriesMultiple([memoryId], minStrength);
  }

  async getLinkedMemoriesMultiple(
    memoryIds: string[],
    minStrength: number = 0.3,
  ): Promise<Array<Memory & { linkStrength: number }>> {
    const out = new Map<string, Memory & { linkStrength: number }>();
    for (const id of memoryIds) {
      for (const [key, strength] of this.links.entries()) {
        if (strength < minStrength) continue;
        const [a, b] = key.split("|");
        const other = a === id ? b : b === id ? a : null;
        if (!other) continue;
        const m = this.memories.get(other);
        if (!m) continue;
        const prev = out.get(other);
        out.set(
          other,
          prev
            ? { ...m, linkStrength: Math.max(prev.linkStrength, strength) }
            : { ...m, linkStrength: strength },
        );
      }
    }
    return Array.from(out.values());
  }

  async deleteLink(sourceId: string, targetId: string): Promise<void> {
    const [a, b] =
      sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
    this.links.delete(`${a}|${b}`);
  }

  async findFadingMemories(
    userId: string,
    maxRetention: number,
  ): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (m) => m.userId === userId && m.retention < maxRetention,
    );
  }

  async findStableMemories(
    userId: string,
    minStability: number,
    minAccessCount: number,
  ): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (m) =>
        m.userId === userId &&
        m.stability >= minStability &&
        m.accessCount >= minAccessCount,
    );
  }

  async markSuperseded(memoryIds: string[], summaryId: string): Promise<void> {
    for (const id of memoryIds) {
      const m = this.memories.get(id);
      if (!m) continue;
      this.memories.set(id, {
        ...m,
        metadata: { ...(m.metadata ?? {}), supersededBy: summaryId },
      });
    }
  }
}

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
