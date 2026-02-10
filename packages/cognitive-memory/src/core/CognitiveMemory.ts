/**
 * Cognitive Memory System - Main Class
 *
 * High-level API for cognitive memory with decay, retrieval strengthening,
 * and associative linking.
 */

import type { MemoryAdapter, MemoryFilters } from "../adapters/base";
import { cosineSimilarity } from "../utils/embeddings";
import { extractTopics } from "../utils/scoring";
import { updateStability } from "./decay";
import type {
  CognitiveMemoryConfig,
  ConsolidationResult,
  EmbeddingProvider,
  Memory,
  MemoryInput,
  MemoryType,
  RetrievalQuery,
  ScoredMemory,
} from "./types";

/**
 * Default configuration values
 */
type ResolvedConfig = {
  userId: string;
  defaultImportance: number;
  defaultStability: number;
  minRetention: number;
  decayRates: Record<MemoryType, number>;
};

const DEFAULT_CONFIG: Omit<ResolvedConfig, "userId"> = {
  defaultImportance: 0.5,
  defaultStability: 0.3,
  minRetention: 0.2,
  decayRates: {
    episodic: 30,
    semantic: 90,
    procedural: Number.POSITIVE_INFINITY,
  },
};

function assertNonEmptyString(field: string, value: string) {
  if (value.trim().length === 0) {
    throw new Error(`Invalid ${field}: ${value} (must be non-empty string)`);
  }
}

function assertUnitInterval(field: string, value: number) {
  if (Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`Invalid ${field}: ${value} (must be [0.0, 1.0])`);
  }
}

function assertNonNegativeInt(field: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid ${field}: ${value} (must be non-negative integer)`,
    );
  }
}

async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Main cognitive memory system
 *
 * Provides high-level API for storing, retrieving, and managing memories
 * with human-like characteristics: decay, retrieval strengthening, and
 * associative linking.
 */
export class CognitiveMemory {
  private adapter: MemoryAdapter;
  private embeddingProvider: EmbeddingProvider;
  private config: ResolvedConfig;

  constructor(options: {
    adapter: MemoryAdapter;
    embeddingProvider: EmbeddingProvider;
    userId: string;
    config?: Partial<CognitiveMemoryConfig>;
  }) {
    assertNonEmptyString("userId", options.userId);

    this.adapter = options.adapter;
    this.embeddingProvider = options.embeddingProvider;
    this.config = {
      userId: options.userId,
      defaultImportance:
        options.config?.defaultImportance ?? DEFAULT_CONFIG.defaultImportance,
      defaultStability:
        options.config?.defaultStability ?? DEFAULT_CONFIG.defaultStability,
      minRetention: options.config?.minRetention ?? DEFAULT_CONFIG.minRetention,
      decayRates: {
        ...DEFAULT_CONFIG.decayRates,
        ...options.config?.decayRates,
      },
    };
  }

  /**
   * Store a new memory
   *
   * Generates embedding and initializes cognitive metadata.
   *
   * @param input Memory content and metadata
   * @returns Created memory ID
   */
  async store(input: MemoryInput): Promise<string> {
    assertNonEmptyString("content", input.content);
    if (input.importance !== undefined)
      assertUnitInterval("importance", input.importance);
    if (input.stability !== undefined)
      assertUnitInterval("stability", input.stability);

    const embedding = await this.embedWithRetry(input.content);

    // Prepare memory data
    const now = Date.now();
    const memory: Omit<Memory, "id" | "createdAt" | "updatedAt"> = {
      userId: this.config.userId,
      content: input.content,
      embedding,
      memoryType: input.memoryType || "semantic",
      importance: input.importance ?? this.config.defaultImportance,
      stability: input.stability ?? this.config.defaultStability,
      accessCount: 0,
      lastAccessed: now,
      retention: 1.0, // Fresh memory
      metadata: input.metadata,
    };

    // Store via adapter
    return this.adapter.createMemory(memory);
  }

  /**
   * Retrieve memories relevant to a query
   *
   * Combines semantic similarity with retention weighting.
   * Optionally includes associatively linked memories.
   *
   * @param query Retrieval query
   * @returns Array of scored memories, sorted by relevance × retention
   */
  async retrieve(query: RetrievalQuery): Promise<ScoredMemory[]> {
    const {
      query: queryText,
      limit = 5,
      minRetention = this.config.minRetention,
      memoryTypes,
      includeAssociations = true,
    } = query;

    assertNonEmptyString("query", queryText);

    const queryEmbedding = await this.embedWithRetry(queryText);

    const candidates = await this.adapter.vectorSearch(queryEmbedding, {
      userId: this.config.userId,
      memoryTypes,
      minRetention,
      limit: limit * 3,
    });

    const scoredCandidates = candidates
      .map((m) => {
        const retention = this.calculateRetentionFor({
          stability: m.stability,
          importance: m.importance,
          accessCount: m.accessCount,
          lastAccessed: m.lastAccessed,
          memoryType: m.memoryType,
        });
        const finalScore = m.relevanceScore * retention;
        return { ...m, retention, finalScore };
      })
      .filter((m) => m.retention >= minRetention)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    const resultById = new Map<string, ScoredMemory>();
    for (const m of scoredCandidates) resultById.set(m.id, m);

    if (includeAssociations && scoredCandidates.length > 0) {
      const associated = await this.adapter.getLinkedMemoriesMultiple(
        scoredCandidates.map((m) => m.id),
        0.3,
      );

      for (const assoc of associated) {
        if (!resultById.has(assoc.id)) {
          const cosine = cosineSimilarity(queryEmbedding, assoc.embedding);
          const relevanceScore = Math.max(cosine, assoc.linkStrength);

          const retention = this.calculateRetentionFor({
            stability: assoc.stability,
            importance: assoc.importance,
            accessCount: assoc.accessCount,
            lastAccessed: assoc.lastAccessed,
            memoryType: assoc.memoryType,
          });

          if (retention < minRetention) continue;

          resultById.set(assoc.id, {
            ...assoc,
            retention,
            relevanceScore,
            finalScore: relevanceScore * retention,
          });
        }
      }
    }

    const results = Array.from(resultById.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    await this.strengthenMemories(results);
    await this.strengthenLinks(results.map((m) => m.id));

    return results;
  }

  /**
   * Get a memory by ID
   *
   * @param id Memory ID
   * @returns Memory or null if not found
   */
  async get(id: string): Promise<Memory | null> {
    const memory = await this.adapter.getMemory(id);

    if (memory) {
      // Strengthen on access
      await this.strengthenMemories([memory]);
    }

    return memory;
  }

  /**
   * Query memories for this user
   *
   * Note: this strengthens returned memories (accessCount/lastAccessed/stability)
   * so decay + reinforcement reflect actual usage.
   */
  async queryMemories(filters: MemoryFilters): Promise<Memory[]> {
    const memories = await this.adapter.queryMemories({
      ...filters,
      userId: this.config.userId,
    });
    if (memories.length > 0) {
      await this.strengthenMemories(memories);
    }
    return memories;
  }

  /**
   * Update a memory's content
   *
   * Regenerates embedding and updates metadata.
   *
   * @param id Memory ID
   * @param content New content
   */
  async update(id: string, content: string): Promise<void> {
    assertNonEmptyString("content", content);

    const memory = await this.adapter.getMemory(id);
    if (!memory) {
      throw new Error(`Memory ${id} not found`);
    }

    const embedding = await this.embedWithRetry(content);

    // Update memory
    await this.adapter.updateMemory(id, {
      content,
      embedding,
      updatedAt: Date.now(),
    });
  }

  /**
   * Run consolidation process
   *
   * Identifies fading memories, compresses similar ones, and cleans up stale data.
   * Should be run periodically (e.g., daily cron).
   *
   * @returns Consolidation results
   */
  async consolidate(): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      decayed: [],
      compressed: [],
      promotionCandidates: [],
      deleted: 0,
    };

    await this.refreshRetentionScores();

    // 1. Find fading memories (retention < 0.2)
    const fading = await this.adapter.findFadingMemories(
      this.config.userId,
      0.2,
    );

    result.decayed = fading.map((m) => ({
      id: m.id,
      retention: m.retention,
    }));

    const groups = new Map<string, Memory[]>();
    for (const memory of fading) {
      const topic = extractTopics(memory.content, 1)[0] ?? "misc";
      if (!groups.has(topic)) {
        groups.set(topic, []);
      }
      groups.get(topic)!.push(memory);
    }

    for (const [topic, memories] of groups) {
      if (memories.length >= 5) {
        const summary = this.summarizeMemories(memories);

        const summaryId = await this.store({
          content: summary,
          memoryType: "semantic",
          importance: Math.max(...memories.map((m) => m.importance)),
          metadata: {
            compressed: true,
            sourceCount: memories.length,
            topic,
          },
        });

        await this.adapter.markSuperseded(
          memories.map((m) => m.id),
          summaryId,
        );

        result.compressed.push({
          summaryId,
          originalIds: memories.map((m) => m.id),
          count: memories.length,
        });
      }
    }

    const stable = await this.adapter.findStableMemories(
      this.config.userId,
      0.9,
      10,
    );

    result.promotionCandidates = stable.map((m) => ({
      id: m.id,
      stability: m.stability,
      accessCount: m.accessCount,
    }));

    const veryFaded = await this.adapter.queryMemories({
      userId: this.config.userId,
      minRetention: 0,
    });

    const toDelete = veryFaded.filter((m) => {
      const daysSinceAccess =
        (Date.now() - m.lastAccessed) / (1000 * 60 * 60 * 24);
      const supersededBy = (
        m.metadata as { supersededBy?: unknown } | undefined
      )?.supersededBy;
      return m.retention < 0.05 && daysSinceAccess > 30 && !supersededBy;
    });

    if (toDelete.length > 0) {
      await this.adapter.deleteMemories(toDelete.map((m) => m.id));
      result.deleted = toDelete.length;
    }

    return result;
  }

  /**
   * Recompute + persist retention for all memories for this user.
   *
   * Useful before consolidation and for periodic background refresh.
   */
  async refreshRetentionScores(): Promise<void> {
    const memories = await this.adapter.queryMemories({
      userId: this.config.userId,
      minRetention: 0,
    });

    const updates = new Map<string, number>();
    for (const m of memories) {
      const retention = this.calculateRetentionFor({
        stability: m.stability,
        importance: m.importance,
        accessCount: m.accessCount,
        lastAccessed: m.lastAccessed,
        memoryType: m.memoryType,
      });
      updates.set(m.id, retention);
    }
    if (updates.size > 0) await this.adapter.updateRetentionScores(updates);
  }

  /**
   * Create a link between two memories
   *
   * @param sourceId Source memory ID
   * @param targetId Target memory ID
   * @param strength Link strength (0.0-1.0)
   */
  async link(
    sourceId: string,
    targetId: string,
    strength: number = 0.5,
  ): Promise<void> {
    assertUnitInterval("strength", strength);
    await this.adapter.createOrStrengthenLink(sourceId, targetId, strength);
  }

  /**
   * Strengthen memories after retrieval (spaced repetition)
   *
   * @private
   */
  private async strengthenMemories(memories: Memory[]): Promise<void> {
    const now = Date.now();

    const updates: Array<{ id: string; updates: Partial<Memory> }> = [];

    for (const memory of memories) {
      assertUnitInterval("stability", memory.stability);
      assertUnitInterval("importance", memory.importance);
      assertNonNegativeInt("accessCount", memory.accessCount);
      if (!Number.isFinite(memory.lastAccessed)) {
        throw new Error(
          `Invalid lastAccessed: ${memory.lastAccessed} (must be valid timestamp)`,
        );
      }

      const daysSinceAccess =
        (now - memory.lastAccessed) / (1000 * 60 * 60 * 24);

      const newStability = updateStability(memory.stability, daysSinceAccess);

      const newRetention = this.calculateRetentionFor({
        stability: newStability,
        importance: memory.importance,
        accessCount: memory.accessCount + 1,
        lastAccessed: now,
        memoryType: memory.memoryType,
      });

      updates.push({
        id: memory.id,
        updates: {
          stability: newStability,
          accessCount: memory.accessCount + 1,
          lastAccessed: now,
          retention: newRetention,
        },
      });
    }

    await this.adapter.transaction(async (adapter) => {
      await Promise.all(
        updates.map(({ id, updates: memoryUpdates }) =>
          adapter.updateMemory(id, memoryUpdates),
        ),
      );
    });
  }

  /**
   * Strengthen links between co-retrieved memories
   *
   * @private
   */
  private async strengthenLinks(memoryIds: string[]): Promise<void> {
    for (let i = 0; i < memoryIds.length; i++) {
      for (let j = i + 1; j < memoryIds.length; j++) {
        await this.adapter.createOrStrengthenLink(
          memoryIds[i],
          memoryIds[j],
          0.1, // Increment strength by 0.1
        );
      }
    }
  }

  private summarizeMemories(memories: Memory[]): string {
    const combined = memories.map((m) => m.content).join(". ");
    return combined.length > 500 ? `${combined.slice(0, 497)}...` : combined;
  }

  private async embedWithRetry(text: string): Promise<number[]> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.embeddingProvider.embed(text);
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          const delayMs = Math.min(2000, 250 * 2 ** attempt);
          await sleep(delayMs);
        }
      }
    }
    throw new Error(`Embedding failed: ${String(lastError)}`);
  }

  private calculateRetentionFor(params: {
    stability: number;
    importance: number;
    accessCount: number;
    lastAccessed: number;
    memoryType: Memory["memoryType"];
  }): number {
    const { stability, importance, accessCount, lastAccessed, memoryType } =
      params;

    // Use config override if provided (defaults are present in merged config).
    const baseDecay = this.config.decayRates[memoryType];
    if (memoryType === "procedural" || baseDecay === Number.POSITIVE_INFINITY) {
      return 1.0;
    }

    // Match decay.ts behavior for validation and edge cases.
    assertUnitInterval("stability", stability);
    assertUnitInterval("importance", importance);

    const daysSinceAccess = Math.max(
      0,
      (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24),
    );
    const importanceBoost = 1.0 + importance * 2.0;
    const frequencyBoost = Math.min(
      2.0,
      1.0 + Math.log1p(Math.max(0, accessCount)) * 0.1,
    );
    const decayConstant =
      stability * importanceBoost * frequencyBoost * baseDecay;
    if (decayConstant < 0.1) {
      return Math.max(0, 1.0 - daysSinceAccess / 10);
    }
    const retention = Math.exp(-daysSinceAccess / decayConstant);
    return Math.max(0, Math.min(1, retention));
  }
}
