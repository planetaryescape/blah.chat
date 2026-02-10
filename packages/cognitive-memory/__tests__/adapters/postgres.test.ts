import type { Pool, PoolClient } from "pg";
import { PostgresAdapter } from "../../src/adapters/postgres";

function makePool() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const connect = vi.fn();
  return { query, connect } as unknown as Pool;
}

describe("PostgresAdapter", () => {
  test("createOrStrengthenLink canonicalizes ids + clamps in SQL", async () => {
    const pool = makePool();
    const adapter = new PostgresAdapter({ pool });

    await adapter.createOrStrengthenLink("b", "a", 0.1);
    const [sql, params] = (pool as any).query.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("LEAST(1");
    expect(params[0]).toBe("a");
    expect(params[1]).toBe("b");
  });

  test("vectorSearch uses pgvector cosine distance + applies filters", async () => {
    const pool = makePool();
    const adapter = new PostgresAdapter({ pool });

    await adapter.vectorSearch([0, 1], {
      userId: "u1",
      memoryTypes: ["semantic"],
      minRetention: 0.2,
      limit: 3,
    });

    const [sql, params] = (pool as any).query.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("(embedding <=> $1::vector)");
    expect(sql).toContain("user_id = $2");
    expect(sql).toContain("memory_type = ANY(");
    expect(sql).toContain("$3::text[])");
    expect(sql).toContain("retention >= $4");
    expect(params[1]).toBe("u1");
  });

  test("transaction issues BEGIN/COMMIT and uses tx client", async () => {
    const pool = makePool();
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
    const clientRelease = vi.fn();
    (pool as any).connect.mockResolvedValue({
      query: clientQuery,
      release: clientRelease,
    } satisfies Partial<PoolClient>);

    const adapter = new PostgresAdapter({ pool });
    await adapter.transaction(async (tx) => {
      await tx.deleteLink("a", "b");
      return 123;
    });

    expect(clientQuery.mock.calls[0][0]).toBe("BEGIN");
    expect(
      clientQuery.mock.calls.some((c) => String(c[0]).includes("DELETE")),
    ).toBe(true);
    expect(clientQuery.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  test("getLinkedMemoriesMultiple emits both directions when querying multiple ids", async () => {
    const pool = makePool();
    const adapter = new PostgresAdapter({ pool });

    await adapter.getLinkedMemoriesMultiple(["a", "b"], 0.3);
    const [sql, params] = (pool as any).query.mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(String(sql)).toContain("UNION ALL");
    expect(String(sql)).toContain("WHERE source_id = ANY($1::text[])");
    expect(String(sql)).toContain("WHERE target_id = ANY($1::text[])");
    expect(params[0]).toEqual(["a", "b"]);
    expect(params[1]).toBe(0.3);
  });

  test("markSuperseded writes metadata.supersededBy", async () => {
    const pool = makePool();
    const adapter = new PostgresAdapter({ pool });
    await adapter.markSuperseded(["m1", "m2"], "s1");
    const [sql] = (pool as any).query.mock.calls[0] as [string];
    expect(sql).toContain("jsonb_build_object('supersededBy'");
  });
});
