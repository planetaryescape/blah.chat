/**
 * Postgres Adapter for Cognitive Memory
 *
 * Requires pgvector extension for vector search.
 */

import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Memory, MemoryType, ScoredMemory } from "../core/types";
import { MemoryAdapter, type MemoryFilters } from "./base";

type Db = Pick<PoolClient, "query">;

function qident(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function vecLiteral(embedding: number[]): string {
  return `[${embedding.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}

function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.filter((n): n is number => typeof n === "number");
  }
  if (typeof raw !== "string") return [];
  const s = raw.trim().replace(/\[|\]/g, "");
  if (s.length === 0) return [];
  return s
    .split(",")
    .map((t: string) => Number(t.trim()))
    .filter((n: number) => Number.isFinite(n));
}

function isMemoryType(value: unknown): value is MemoryType {
  return value === "episodic" || value === "semantic" || value === "procedural";
}

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type PostgresAdapterOptions = {
  pool: Pool;
  schema?: string;
  memoriesTable?: string;
  linksTable?: string;
  dimensions?: number;
  now?: () => number;
  idFactory?: () => string;
};

export function postgresSchemaSql(options?: {
  schema?: string;
  memoriesTable?: string;
  linksTable?: string;
  dimensions?: number;
}): string {
  const schema = options?.schema ?? "public";
  const memoriesTable = options?.memoriesTable ?? "cognitive_memories";
  const linksTable = options?.linksTable ?? "cognitive_memory_links";
  const dimensions = options?.dimensions ?? 1536;

  const mem = `${qident(schema)}.${qident(memoriesTable)}`;
  const lnk = `${qident(schema)}.${qident(linksTable)}`;

  return [
    `CREATE EXTENSION IF NOT EXISTS vector;`,
    `CREATE TABLE IF NOT EXISTS ${mem} (`,
    `  id text PRIMARY KEY,`,
    `  user_id text NOT NULL,`,
    `  content text NOT NULL,`,
    `  embedding vector(${dimensions}) NOT NULL,`,
    `  memory_type text NOT NULL CHECK (memory_type IN ('episodic','semantic','procedural')),`,
    `  importance double precision NOT NULL,`,
    `  stability double precision NOT NULL,`,
    `  access_count integer NOT NULL,`,
    `  last_accessed bigint NOT NULL,`,
    `  retention double precision NOT NULL,`,
    `  metadata jsonb,`,
    `  created_at bigint NOT NULL,`,
    `  updated_at bigint NOT NULL`,
    `);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memories_by_user_created ON ${mem} (user_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memories_by_user_retention ON ${mem} (user_id, retention);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memories_by_user_stability ON ${mem} (user_id, stability);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memories_embedding_idx ON ${mem} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`,
    `CREATE TABLE IF NOT EXISTS ${lnk} (`,
    `  source_id text NOT NULL,`,
    `  target_id text NOT NULL,`,
    `  strength double precision NOT NULL,`,
    `  created_at bigint NOT NULL,`,
    `  updated_at bigint NOT NULL,`,
    `  PRIMARY KEY (source_id, target_id),`,
    `  FOREIGN KEY (source_id) REFERENCES ${mem} (id) ON DELETE CASCADE,`,
    `  FOREIGN KEY (target_id) REFERENCES ${mem} (id) ON DELETE CASCADE`,
    `);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memory_links_by_source_strength ON ${lnk} (source_id, strength);`,
    `CREATE INDEX IF NOT EXISTS cognitive_memory_links_by_target_strength ON ${lnk} (target_id, strength);`,
    ``,
  ].join("\n");
}

export class PostgresAdapter extends MemoryAdapter {
  private pool: Pool | null;
  private db: Db;
  private now: () => number;
  private idFactory: () => string;
  private schema: string;
  private memoriesTable: string;
  private linksTable: string;
  private mem: string;
  private lnk: string;

  constructor(options: PostgresAdapterOptions, txClient?: PoolClient) {
    super();
    this.pool = txClient ? null : options.pool;
    this.db = txClient ?? options.pool;
    this.now = options.now ?? Date.now;
    this.idFactory = options.idFactory ?? randomUUID;

    this.schema = options.schema ?? "public";
    this.memoriesTable = options.memoriesTable ?? "cognitive_memories";
    this.linksTable = options.linksTable ?? "cognitive_memory_links";
    this.mem = `${qident(this.schema)}.${qident(this.memoriesTable)}`;
    this.lnk = `${qident(this.schema)}.${qident(this.linksTable)}`;
  }

  async transaction<T>(
    callback: (adapter: MemoryAdapter) => Promise<T>,
  ): Promise<T> {
    if (!this.pool) return callback(this);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const tx = new PostgresAdapter(
        {
          pool: this.pool,
          schema: this.schema,
          memoriesTable: this.memoriesTable,
          linksTable: this.linksTable,
          now: this.now,
          idFactory: this.idFactory,
        },
        client,
      );
      const out = await callback(tx);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async createMemory(
    memory: Omit<Memory, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const id = this.idFactory();
    const now = this.now();

    await this.db.query(
      `INSERT INTO ${this.mem} (
        id, user_id, content, embedding, memory_type, importance, stability, access_count, last_accessed, retention, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13
      )`,
      [
        id,
        memory.userId,
        memory.content,
        vecLiteral(memory.embedding),
        memory.memoryType,
        memory.importance,
        memory.stability,
        memory.accessCount,
        memory.lastAccessed,
        memory.retention,
        memory.metadata ? JSON.stringify(memory.metadata) : null,
        now,
        now,
      ],
    );

    return id;
  }

  async getMemory(id: string): Promise<Memory | null> {
    const res = await this.db.query(`SELECT * FROM ${this.mem} WHERE id = $1`, [
      id,
    ]);
    const row = res.rows[0];
    if (!row) return null;
    return this.rowToMemory(row);
  }

  async getMemories(ids: string[]): Promise<Memory[]> {
    if (ids.length === 0) return [];
    const res = await this.db.query(
      `SELECT * FROM ${this.mem} WHERE id = ANY($1::text[])`,
      [ids],
    );
    return res.rows
      .map((r: Record<string, unknown>) => this.rowToMemory(r))
      .filter(Boolean) as Memory[];
  }

  async queryMemories(filters: MemoryFilters): Promise<Memory[]> {
    const { sql, params } = this.buildWhere(filters, 1);
    const limit =
      typeof filters.limit === "number" ? Math.max(0, filters.limit) : null;
    const offset =
      typeof filters.offset === "number" ? Math.max(0, filters.offset) : null;

    const parts = [
      `SELECT * FROM ${this.mem}`,
      sql,
      `ORDER BY created_at DESC`,
    ];
    if (limit !== null) {
      params.push(limit);
      parts.push(`LIMIT $${params.length}`);
    }
    if (offset !== null) {
      params.push(offset);
      parts.push(`OFFSET $${params.length}`);
    }

    const res = await this.db.query(parts.filter(Boolean).join(" "), params);
    return res.rows
      .map((r: Record<string, unknown>) => this.rowToMemory(r))
      .filter(Boolean) as Memory[];
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [id];
    let i = 1;

    const add = (col: string, value: unknown, cast?: string) => {
      params.push(value);
      i += 1;
      sets.push(`${col} = $${i}${cast ?? ""}`);
    };

    if (updates.userId !== undefined) add("user_id", updates.userId);
    if (updates.content !== undefined) add("content", updates.content);
    if (updates.embedding !== undefined)
      add("embedding", vecLiteral(updates.embedding), "::vector");
    if (updates.memoryType !== undefined)
      add("memory_type", updates.memoryType);
    if (updates.importance !== undefined) add("importance", updates.importance);
    if (updates.stability !== undefined) add("stability", updates.stability);
    if (updates.accessCount !== undefined)
      add("access_count", updates.accessCount);
    if (updates.lastAccessed !== undefined)
      add("last_accessed", updates.lastAccessed);
    if (updates.retention !== undefined) add("retention", updates.retention);
    if (updates.metadata !== undefined)
      add("metadata", JSON.stringify(updates.metadata), "::jsonb");
    if (updates.createdAt !== undefined) add("created_at", updates.createdAt);
    if (updates.updatedAt !== undefined) add("updated_at", updates.updatedAt);

    if (sets.length === 0) return;

    await this.db.query(
      `UPDATE ${this.mem} SET ${sets.join(", ")} WHERE id = $1`,
      params,
    );
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db.query(`DELETE FROM ${this.mem} WHERE id = $1`, [id]);
  }

  async deleteMemories(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.query(`DELETE FROM ${this.mem} WHERE id = ANY($1::text[])`, [
      ids,
    ]);
  }

  async vectorSearch(
    embedding: number[],
    filters?: MemoryFilters,
  ): Promise<ScoredMemory[]> {
    const limit =
      typeof filters?.limit === "number" ? Math.max(0, filters.limit) : 5;
    const params: unknown[] = [vecLiteral(embedding)];

    const { sql, params: whereParams } = this.buildWhere(filters ?? {}, 2);
    params.push(...whereParams);

    const res = await this.db.query(
      [
        `SELECT *, (1 - (embedding <=> $1::vector)) AS relevance_score`,
        `FROM ${this.mem}`,
        sql,
        `ORDER BY (embedding <=> $1::vector) ASC`,
        `LIMIT $${params.length + 1}`,
      ].join(" "),
      [...params, limit],
    );

    return res.rows
      .map((r: Record<string, unknown>) => {
        const memory = this.rowToMemory(r);
        if (!memory) return null;
        const relevanceScore =
          typeof (r as any).relevance_score === "number"
            ? ((r as any).relevance_score as number)
            : 0;
        return {
          ...memory,
          relevanceScore,
          finalScore: relevanceScore * memory.retention,
        } satisfies ScoredMemory;
      })
      .filter(Boolean) as ScoredMemory[];
  }

  async updateRetentionScores(updates: Map<string, number>): Promise<void> {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const rets = entries.map(([, r]) => r);

    await this.db.query(
      `UPDATE ${this.mem} AS m SET retention = v.retention
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::double precision[]) AS retention) AS v
       WHERE m.id = v.id`,
      [ids, rets],
    );
  }

  async createOrStrengthenLink(
    sourceId: string,
    targetId: string,
    strength: number,
  ): Promise<void> {
    const [a, b] = canonicalPair(sourceId, targetId);
    const now = this.now();
    await this.db.query(
      `INSERT INTO ${this.lnk} (source_id, target_id, strength, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (source_id, target_id) DO UPDATE
       SET strength = LEAST(1, strength + EXCLUDED.strength),
           updated_at = EXCLUDED.updated_at`,
      [a, b, strength, now],
    );
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
    if (memoryIds.length === 0) return [];

    const res = await this.db.query(
      `WITH link_edges AS (
         SELECT target_id AS other_id, strength AS link_strength
         FROM ${this.lnk}
         WHERE source_id = ANY($1::text[])
           AND strength >= $2

         UNION ALL

         SELECT source_id AS other_id, strength AS link_strength
         FROM ${this.lnk}
         WHERE target_id = ANY($1::text[])
           AND strength >= $2
       ),
       links AS (
         SELECT other_id, MAX(link_strength) AS link_strength
         FROM link_edges
         GROUP BY other_id
       )
       SELECT m.*, l.link_strength
       FROM links l
       JOIN ${this.mem} m ON m.id = l.other_id`,
      [memoryIds, minStrength],
    );

    return res.rows
      .map((r: Record<string, unknown>) => {
        const memory = this.rowToMemory(r);
        if (!memory) return null;
        const linkStrength =
          typeof (r as any).link_strength === "number"
            ? ((r as any).link_strength as number)
            : 0;
        return { ...memory, linkStrength };
      })
      .filter(Boolean) as Array<Memory & { linkStrength: number }>;
  }

  async deleteLink(sourceId: string, targetId: string): Promise<void> {
    const [a, b] = canonicalPair(sourceId, targetId);
    await this.db.query(
      `DELETE FROM ${this.lnk} WHERE source_id = $1 AND target_id = $2`,
      [a, b],
    );
  }

  async findFadingMemories(
    userId: string,
    maxRetention: number,
  ): Promise<Memory[]> {
    const res = await this.db.query(
      `SELECT * FROM ${this.mem} WHERE user_id = $1 AND retention < $2 ORDER BY retention ASC`,
      [userId, maxRetention],
    );
    return res.rows
      .map((r: Record<string, unknown>) => this.rowToMemory(r))
      .filter(Boolean) as Memory[];
  }

  async findStableMemories(
    userId: string,
    minStability: number,
    minAccessCount: number,
  ): Promise<Memory[]> {
    const res = await this.db.query(
      `SELECT * FROM ${this.mem}
       WHERE user_id = $1 AND stability >= $2 AND access_count >= $3
       ORDER BY stability DESC, access_count DESC`,
      [userId, minStability, minAccessCount],
    );
    return res.rows
      .map((r: Record<string, unknown>) => this.rowToMemory(r))
      .filter(Boolean) as Memory[];
  }

  async markSuperseded(memoryIds: string[], summaryId: string): Promise<void> {
    if (memoryIds.length === 0) return;
    await this.db.query(
      `UPDATE ${this.mem}
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('supersededBy', $2)
       WHERE id = ANY($1::text[])`,
      [memoryIds, summaryId],
    );
  }

  private buildWhere(
    filters: MemoryFilters,
    startIndex: number,
  ): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = startIndex - 1;

    const add = (clause: string, value: unknown, suffix: string = "") => {
      params.push(value);
      i += 1;
      clauses.push(`${clause} $${i}${suffix}`);
    };

    if (filters.userId) add(`user_id =`, filters.userId);
    if (filters.memoryTypes && filters.memoryTypes.length > 0)
      add(`memory_type = ANY(`, filters.memoryTypes, `::text[])`);
    if (filters.minRetention !== undefined)
      add(`retention >=`, filters.minRetention);
    if (filters.minImportance !== undefined)
      add(`importance >=`, filters.minImportance);
    if (filters.createdAfter !== undefined)
      add(`created_at >=`, filters.createdAfter);
    if (filters.createdBefore !== undefined)
      add(`created_at <=`, filters.createdBefore);

    return {
      sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  private rowToMemory(row: Record<string, unknown>): Memory | null {
    const id = typeof row.id === "string" ? row.id : null;
    const userId = typeof row.user_id === "string" ? row.user_id : null;
    const content = typeof row.content === "string" ? row.content : null;
    const createdAt = toNumber(row.created_at);
    const updatedAt = toNumber(row.updated_at);

    if (!id || !userId || !content || createdAt === null || updatedAt === null)
      return null;

    const memoryType = isMemoryType(row.memory_type)
      ? row.memory_type
      : "semantic";

    const embedding = parseVector(row.embedding);
    const importance = toNumber(row.importance) ?? 0.5;
    const stability = toNumber(row.stability) ?? 0.3;
    const accessCount = toNumber(row.access_count) ?? 0;
    const lastAccessed = toNumber(row.last_accessed) ?? createdAt;
    const retention = toNumber(row.retention) ?? 1.0;

    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined;

    return {
      id,
      userId,
      content,
      embedding,
      memoryType,
      importance,
      stability,
      accessCount,
      lastAccessed,
      retention,
      createdAt,
      updatedAt,
      metadata,
    };
  }
}
