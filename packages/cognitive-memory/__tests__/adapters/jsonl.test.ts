import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonlFileAdapter } from "../../src/adapters/jsonl";

describe("JsonlFileAdapter", () => {
  test("persists + replays memories and links", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cm-jsonl-"));
    const path = join(dir, "memories.jsonl");

    const a1 = new JsonlFileAdapter({ path });
    const m1 = await a1.createMemory({
      userId: "u1",
      content: "a",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
    });
    const m2 = await a1.createMemory({
      userId: "u1",
      content: "b",
      embedding: [0, 1],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
    });
    await a1.createOrStrengthenLink(m1, m2, 0.5);

    const a2 = new JsonlFileAdapter({ path });
    expect((await a2.getMemory(m1))?.content).toBe("a");
    const linked = await a2.getLinkedMemories(m1, 0.3);
    expect(linked[0].id).toBe(m2);
    expect(linked[0].linkStrength).toBeCloseTo(0.5, 6);
  });

  test("update + delete append events", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cm-jsonl-"));
    const path = join(dir, "memories.jsonl");

    const a = new JsonlFileAdapter({ path });
    const id = await a.createMemory({
      userId: "u1",
      content: "a",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
    });
    await a.updateMemory(id, { content: "a2" });
    await a.deleteMemory(id);

    const txt = await readFile(path, "utf8");
    expect(txt).toContain('"type":"memory"');
    expect(txt).toContain('"type":"memory_delete"');
    const a2 = new JsonlFileAdapter({ path });
    expect(await a2.getMemory(id)).toBeNull();
  });

  test("vectorSearch returns scored results", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cm-jsonl-"));
    const path = join(dir, "memories.jsonl");

    const a = new JsonlFileAdapter({ path });
    await a.createMemory({
      userId: "u1",
      content: "a",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 0.5,
    });
    await a.createMemory({
      userId: "u1",
      content: "b",
      embedding: [0, 1],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 0.9,
    });

    const results = await a.vectorSearch([1, 0], { userId: "u1", limit: 2 });
    expect(results[0].content).toBe("a");
    expect(results[0].relevanceScore).toBeGreaterThan(
      results[1].relevanceScore,
    );
    expect(results[0].finalScore).toBeCloseTo(
      results[0].relevanceScore * results[0].retention,
      8,
    );
  });

  test("rollover preserves history and replays across rotated logs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cm-jsonl-"));
    const path = join(dir, "memories.jsonl");

    const a1 = new JsonlFileAdapter({ path, rollover: { maxLines: 2 } });
    const m1 = await a1.createMemory({
      userId: "u1",
      content: "a",
      embedding: [1, 0],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
    });
    const m2 = await a1.createMemory({
      userId: "u1",
      content: "b",
      embedding: [0, 1],
      memoryType: "semantic",
      importance: 0.5,
      stability: 0.3,
      accessCount: 0,
      lastAccessed: 1,
      retention: 1,
    });

    const files = await readdir(dir);
    expect(files.some((f) => f.startsWith("memories.jsonl."))).toBe(true);

    const a2 = new JsonlFileAdapter({ path, rollover: { maxLines: 2 } });
    expect((await a2.getMemory(m1))?.content).toBe("a");
    expect((await a2.getMemory(m2))?.content).toBe("b");
  });
});
