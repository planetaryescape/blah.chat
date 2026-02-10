/**
 * Convex Adapter for Cognitive Memory
 *
 * Implements MemoryAdapter interface for Convex database.
 */

import type { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import type { Memory, MemoryType, ScoredMemory } from "../core/types";
import { MemoryAdapter, type MemoryFilters } from "./base";

type PublicQueryRef<A extends Record<string, unknown>, R> = FunctionReference<
  "query",
  "public",
  A,
  R
>;
type PublicMutationRef<
  A extends Record<string, unknown>,
  R,
> = FunctionReference<"mutation", "public", A, R>;
type PublicActionRef<A extends Record<string, unknown>, R> = FunctionReference<
  "action",
  "public",
  A,
  R
>;

export type ConvexAdapterFunctions = {
  createCognitiveMemory: PublicMutationRef<Record<string, unknown>, string>;
  updateCognitiveMemory: PublicMutationRef<Record<string, unknown>, null>;
  deleteCognitiveMemory: PublicMutationRef<Record<string, unknown>, null>;
  deleteCognitiveMemories: PublicMutationRef<Record<string, unknown>, null>;
  getCognitiveMemory: PublicQueryRef<Record<string, unknown>, unknown>;
  getCognitiveMemories: PublicQueryRef<Record<string, unknown>, unknown>;
  queryCognitiveMemories: PublicQueryRef<Record<string, unknown>, unknown>;
  findFadingMemories: PublicQueryRef<Record<string, unknown>, unknown>;
  findStableMemories: PublicQueryRef<Record<string, unknown>, unknown>;
  markSuperseded: PublicMutationRef<Record<string, unknown>, null>;
  batchUpdateRetention: PublicMutationRef<Record<string, unknown>, null>;
  cognitiveVectorSearch: PublicActionRef<Record<string, unknown>, unknown>;

  createOrStrengthenLink: PublicMutationRef<Record<string, unknown>, null>;
  getLinkedMemories: PublicQueryRef<Record<string, unknown>, unknown>;
  getLinkedMemoriesMultiple: PublicQueryRef<Record<string, unknown>, unknown>;
  deleteLink: PublicMutationRef<Record<string, unknown>, null>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryType(value: unknown): value is MemoryType {
  return value === "episodic" || value === "semantic" || value === "procedural";
}

export class ConvexAdapter extends MemoryAdapter {
  private client: ConvexClient;
  private fns: ConvexAdapterFunctions;

  constructor(options: {
    client: ConvexClient;
    functions: ConvexAdapterFunctions;
  }) {
    super();
    this.client = options.client;
    this.fns = options.functions;
  }

  async transaction<T>(
    callback: (adapter: MemoryAdapter) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  async createMemory(
    memory: Omit<Memory, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const now = Date.now();

    const category =
      isRecord(memory.metadata) && typeof memory.metadata.category === "string"
        ? memory.metadata.category
        : "user_profile";

    const importance10 = memory.importance * 10;

    const id = await this.client.mutation(this.fns.createCognitiveMemory, {
      userId: memory.userId,
      content: memory.content,
      embedding: memory.embedding,
      memoryType: memory.memoryType,
      stability: memory.stability,
      accessCount: memory.accessCount,
      lastAccessed: memory.lastAccessed,
      retention: memory.retention,
      metadata: {
        category,
        importance: importance10,
        extractedAt: now,
        confidence: 1.0,
        verifiedBy: "manual",
      },
    });

    return id;
  }

  async getMemory(id: string): Promise<Memory | null> {
    const raw = await this.client.query(this.fns.getCognitiveMemory, { id });
    if (!raw) return null;
    return this.convexToMemory(raw);
  }

  async getMemories(ids: string[]): Promise<Memory[]> {
    const raw = await this.client.query(this.fns.getCognitiveMemories, { ids });
    if (!Array.isArray(raw)) return [];
    const out: Memory[] = [];
    for (const m of raw) {
      const memory = this.convexToMemory(m);
      if (memory) out.push(memory);
    }
    return out;
  }

  async queryMemories(filters: MemoryFilters): Promise<Memory[]> {
    const raw = await this.client.query(this.fns.queryCognitiveMemories, {
      ...filters,
    });
    if (!Array.isArray(raw)) return [];
    const out: Memory[] = [];
    for (const m of raw) {
      const memory = this.convexToMemory(m);
      if (memory) out.push(memory);
    }
    return out;
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const payload: Record<string, unknown> = { id };

    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.embedding !== undefined) payload.embedding = updates.embedding;
    if (updates.memoryType !== undefined)
      payload.memoryType = updates.memoryType;
    if (updates.stability !== undefined) payload.stability = updates.stability;
    if (updates.accessCount !== undefined)
      payload.accessCount = updates.accessCount;
    if (updates.lastAccessed !== undefined)
      payload.lastAccessed = updates.lastAccessed;
    if (updates.retention !== undefined) payload.retention = updates.retention;
    if (updates.importance !== undefined)
      payload.importance = updates.importance * 10;

    await this.client.mutation(this.fns.updateCognitiveMemory, payload);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.client.mutation(this.fns.deleteCognitiveMemory, { id });
  }

  async deleteMemories(ids: string[]): Promise<void> {
    await this.client.mutation(this.fns.deleteCognitiveMemories, { ids });
  }

  async vectorSearch(
    embedding: number[],
    filters?: MemoryFilters,
  ): Promise<ScoredMemory[]> {
    const raw = await this.client.action(this.fns.cognitiveVectorSearch, {
      embedding,
      userId: filters?.userId,
      memoryTypes: filters?.memoryTypes,
      minRetention: filters?.minRetention,
      limit: filters?.limit ?? 5,
    });

    if (!Array.isArray(raw)) return [];

    const out: ScoredMemory[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const memory = this.convexToMemory(item.memory);
      if (!memory) continue;
      const relevanceScore =
        typeof item.relevanceScore === "number" ? item.relevanceScore : 0;
      out.push({
        ...memory,
        relevanceScore,
        finalScore: relevanceScore * memory.retention,
      });
    }

    return out;
  }

  async updateRetentionScores(updates: Map<string, number>): Promise<void> {
    const entries = Array.from(updates.entries()).map(([id, retention]) => ({
      id,
      retention,
    }));
    await this.client.mutation(this.fns.batchUpdateRetention, {
      updates: entries,
    });
  }

  async createOrStrengthenLink(
    sourceId: string,
    targetId: string,
    strength: number,
  ): Promise<void> {
    await this.client.mutation(this.fns.createOrStrengthenLink, {
      sourceId,
      targetId,
      strength,
    });
  }

  async getLinkedMemories(
    memoryId: string,
    minStrength: number = 0.3,
  ): Promise<Array<Memory & { linkStrength: number }>> {
    const raw = await this.client.query(this.fns.getLinkedMemories, {
      memoryId,
      minStrength,
    });
    return this.linkedResultToMemories(raw);
  }

  async getLinkedMemoriesMultiple(
    memoryIds: string[],
    minStrength: number = 0.3,
  ): Promise<Array<Memory & { linkStrength: number }>> {
    const raw = await this.client.query(this.fns.getLinkedMemoriesMultiple, {
      memoryIds,
      minStrength,
    });
    return this.linkedResultToMemories(raw);
  }

  async deleteLink(sourceId: string, targetId: string): Promise<void> {
    await this.client.mutation(this.fns.deleteLink, { sourceId, targetId });
  }

  async findFadingMemories(
    userId: string,
    maxRetention: number,
  ): Promise<Memory[]> {
    const raw = await this.client.query(this.fns.findFadingMemories, {
      userId,
      maxRetention,
    });
    if (!Array.isArray(raw)) return [];
    const out: Memory[] = [];
    for (const m of raw) {
      const memory = this.convexToMemory(m);
      if (memory) out.push(memory);
    }
    return out;
  }

  async findStableMemories(
    userId: string,
    minStability: number,
    minAccessCount: number,
  ): Promise<Memory[]> {
    const raw = await this.client.query(this.fns.findStableMemories, {
      userId,
      minStability,
      minAccessCount,
    });
    if (!Array.isArray(raw)) return [];
    const out: Memory[] = [];
    for (const m of raw) {
      const memory = this.convexToMemory(m);
      if (memory) out.push(memory);
    }
    return out;
  }

  async markSuperseded(memoryIds: string[], summaryId: string): Promise<void> {
    await this.client.mutation(this.fns.markSuperseded, {
      memoryIds,
      summaryId,
    });
  }

  private linkedResultToMemories(
    raw: unknown,
  ): Array<Memory & { linkStrength: number }> {
    if (!Array.isArray(raw)) return [];
    const out: Array<Memory & { linkStrength: number }> = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const memory = this.convexToMemory(item.memory);
      if (!memory) continue;
      const linkStrength =
        typeof item.strength === "number" ? item.strength : 0;
      out.push({ ...memory, linkStrength });
    }
    return out;
  }

  private convexToMemory(raw: unknown): Memory | null {
    if (!isRecord(raw)) return null;

    const id = typeof raw._id === "string" ? raw._id : null;
    const userId = typeof raw.userId === "string" ? raw.userId : null;
    const content = typeof raw.content === "string" ? raw.content : null;
    const embedding = Array.isArray(raw.embedding) ? raw.embedding : null;
    const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : null;
    const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : null;

    if (
      !id ||
      !userId ||
      !content ||
      !embedding ||
      createdAt === null ||
      updatedAt === null
    ) {
      return null;
    }

    const metadata = isRecord(raw.metadata) ? raw.metadata : undefined;
    const importance10 =
      metadata && typeof metadata.importance === "number"
        ? metadata.importance
        : 5;

    const memoryType = isMemoryType(raw.memoryType)
      ? raw.memoryType
      : "semantic";
    const stability = typeof raw.stability === "number" ? raw.stability : 0.3;
    const accessCount =
      typeof raw.accessCount === "number" ? raw.accessCount : 0;
    const lastAccessed =
      typeof raw.lastAccessed === "number" ? raw.lastAccessed : createdAt;
    const retention = typeof raw.retention === "number" ? raw.retention : 1.0;

    return {
      id,
      userId,
      content,
      embedding: embedding.reduce<number[]>((acc, n) => {
        if (typeof n === "number") acc.push(n);
        return acc;
      }, []),
      memoryType,
      importance: importance10 / 10,
      stability,
      accessCount,
      lastAccessed,
      retention,
      createdAt,
      updatedAt,
      metadata: metadata ?? undefined,
    };
  }
}
