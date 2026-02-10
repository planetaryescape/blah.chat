/**
 * Cognitive Memory System - Base Adapter Interface
 *
 * Abstract adapter that concrete implementations (Convex, Postgres, etc.) must implement.
 * Provides database-agnostic interface for memory storage and retrieval.
 */

import type { Memory, MemoryType, ScoredMemory } from "../core/types";

/**
 * Filters for querying memories
 */
export interface MemoryFilters {
  /** Filter by user ID */
  userId?: string;

  /** Filter by memory types */
  memoryTypes?: MemoryType[];

  /** Minimum retention threshold */
  minRetention?: number;

  /** Minimum importance */
  minImportance?: number;

  /** Created after timestamp */
  createdAfter?: number;

  /** Created before timestamp */
  createdBefore?: number;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Abstract adapter interface for memory persistence
 *
 * Implementations must handle:
 * - CRUD operations on memories
 * - Vector search for semantic retrieval
 * - Link management for associative memory
 * - Batch operations for consolidation
 */
export abstract class MemoryAdapter {
  /**
   * Create a new memory
   *
   * @param memory Memory data to store
   * @returns Created memory ID
   */
  abstract createMemory(
    memory: Omit<Memory, "id" | "createdAt" | "updatedAt">,
  ): Promise<string>;

  /**
   * Get memory by ID
   *
   * @param id Memory ID
   * @returns Memory or null if not found
   */
  abstract getMemory(id: string): Promise<Memory | null>;

  /**
   * Get multiple memories by IDs
   *
   * @param ids Array of memory IDs
   * @returns Array of memories (may be partial if some IDs don't exist)
   */
  abstract getMemories(ids: string[]): Promise<Memory[]>;

  /**
   * Query memories with filters
   *
   * @param filters Query filters
   * @returns Array of matching memories
   */
  abstract queryMemories(filters: MemoryFilters): Promise<Memory[]>;

  /**
   * Update an existing memory
   *
   * @param id Memory ID
   * @param updates Partial memory data to update
   */
  abstract updateMemory(id: string, updates: Partial<Memory>): Promise<void>;

  /**
   * Delete a memory
   *
   * @param id Memory ID
   */
  abstract deleteMemory(id: string): Promise<void>;

  /**
   * Delete multiple memories
   *
   * @param ids Array of memory IDs
   */
  abstract deleteMemories(ids: string[]): Promise<void>;

  /**
   * Perform vector similarity search
   *
   * @param embedding Query embedding vector
   * @param filters Optional filters to apply
   * @returns Array of memories with similarity scores
   */
  abstract vectorSearch(
    embedding: number[],
    filters?: MemoryFilters,
  ): Promise<ScoredMemory[]>;

  /**
   * Update retention scores for memories
   * Used for caching retention calculations.
   *
   * @param updates Map of memory ID -> new retention score
   */
  abstract updateRetentionScores(updates: Map<string, number>): Promise<void>;

  /**
   * Create or strengthen a link between two memories
   *
   * @param sourceId Source memory ID
   * @param targetId Target memory ID
   * @param strength Link strength (0.0-1.0)
   */
  abstract createOrStrengthenLink(
    sourceId: string,
    targetId: string,
    strength: number,
  ): Promise<void>;

  /**
   * Get memories linked to a given memory
   *
   * @param memoryId Memory ID
   * @param minStrength Minimum link strength threshold
   * @returns Array of linked memories with link data
   */
  abstract getLinkedMemories(
    memoryId: string,
    minStrength?: number,
  ): Promise<Array<Memory & { linkStrength: number }>>;

  /**
   * Get memories linked to multiple source memories
   *
   * @param memoryIds Array of source memory IDs
   * @param minStrength Minimum link strength threshold
   * @returns Array of linked memories (deduplicated)
   */
  abstract getLinkedMemoriesMultiple(
    memoryIds: string[],
    minStrength?: number,
  ): Promise<Array<Memory & { linkStrength: number }>>;

  /**
   * Delete a link between two memories
   *
   * @param sourceId Source memory ID
   * @param targetId Target memory ID
   */
  abstract deleteLink(sourceId: string, targetId: string): Promise<void>;

  /**
   * Find memories with low retention (for consolidation)
   *
   * @param userId User ID
   * @param maxRetention Maximum retention threshold
   * @returns Array of fading memories
   */
  abstract findFadingMemories(
    userId: string,
    maxRetention: number,
  ): Promise<Memory[]>;

  /**
   * Find highly stable memories (candidates for promotion)
   *
   * @param userId User ID
   * @param minStability Minimum stability threshold
   * @param minAccessCount Minimum access count
   * @returns Array of stable memories
   */
  abstract findStableMemories(
    userId: string,
    minStability: number,
    minAccessCount: number,
  ): Promise<Memory[]>;

  /**
   * Mark memories as superseded by a summary
   *
   * @param memoryIds Original memory IDs
   * @param summaryId Summary memory ID
   */
  abstract markSuperseded(
    memoryIds: string[],
    summaryId: string,
  ): Promise<void>;

  /**
   * Transaction support (if available)
   * Implementations can return a no-op if transactions aren't supported.
   */
  abstract transaction<T>(
    callback: (adapter: MemoryAdapter) => Promise<T>,
  ): Promise<T>;
}
