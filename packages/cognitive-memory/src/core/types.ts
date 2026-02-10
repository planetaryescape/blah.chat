/**
 * Cognitive Memory System - Core Types
 *
 * TypeScript interfaces for human-like memory with Ebbinghaus decay,
 * spaced repetition, and associative linking.
 */

/**
 * Memory types with different decay characteristics
 *
 * - Episodic: Events with time/place context (30-day base decay)
 * - Semantic: Facts without temporal context (90-day base decay)
 * - Procedural: Skills and how-to knowledge (no decay, updated by correction)
 */
export type MemoryType = "episodic" | "semantic" | "procedural";

/**
 * Base memory interface with cognitive metadata
 */
export interface Memory {
  /** Unique identifier */
  id: string;

  /** User/agent this memory belongs to */
  userId: string;

  /** Memory content (text) */
  content: string;

  /** Vector embedding for semantic search */
  embedding: number[];

  /** Type of memory (affects decay rate) */
  memoryType: MemoryType;

  /** Importance score (0.0-1.0, affects decay resistance) */
  importance: number;

  /** Stability (0.0-1.0, grows with retrievals) */
  stability: number;

  /** Number of times this memory has been accessed */
  accessCount: number;

  /** Timestamp of last access */
  lastAccessed: number;

  /** Current retention score (0.0-1.0, cached for performance) */
  retention: number;

  /** When this memory was created */
  createdAt: number;

  /** When this memory was last updated */
  updatedAt: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for storing a new memory
 */
export interface MemoryInput {
  /** Memory content */
  content: string;

  /** Type of memory */
  memoryType?: MemoryType;

  /** Importance (0.0-1.0), auto-scored if not provided */
  importance?: number;

  /** Initial stability (default: 0.3) */
  stability?: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Query for retrieving memories
 */
export interface RetrievalQuery {
  /** Search query text */
  query: string;

  /** Maximum number of results */
  limit?: number;

  /** Minimum retention threshold (0.0-1.0) */
  minRetention?: number;

  /** Filter by memory types */
  memoryTypes?: MemoryType[];

  /** Include associatively linked memories */
  includeAssociations?: boolean;
}

/**
 * Memory with retrieval score
 */
export interface ScoredMemory extends Memory {
  /** Semantic similarity score */
  relevanceScore: number;

  /** Final score (relevance × retention) */
  finalScore: number;
}

/**
 * Link between two memories
 */
export interface MemoryLink {
  /** Source memory ID */
  sourceId: string;

  /** Target memory ID */
  targetId: string;

  /** Link strength (0.0-1.0) */
  strength: number;

  /** When this link was created */
  createdAt: number;

  /** When this link was last strengthened */
  updatedAt: number;
}

/**
 * Result of consolidation process
 */
export interface ConsolidationResult {
  /** Memories that decayed significantly */
  decayed: Array<{ id: string; retention: number }>;

  /** Compressed memory groups */
  compressed: Array<{
    summaryId: string;
    originalIds: string[];
    count: number;
  }>;

  /** Memories eligible for promotion to long-term storage */
  promotionCandidates: Array<{
    id: string;
    stability: number;
    accessCount: number;
  }>;

  /** Number of memories soft-deleted */
  deleted: number;
}

/**
 * Decay calculation parameters
 */
export interface DecayParameters {
  /** Memory stability (0.0-1.0) */
  stability: number;

  /** Importance score (0.0-1.0) */
  importance: number;

  /** Number of times accessed (frequency signal) */
  accessCount?: number;

  /** Timestamp of last access */
  lastAccessed: number;

  /** Memory type */
  memoryType: MemoryType;
}

/**
 * Configuration for cognitive memory system
 */
export interface CognitiveMemoryConfig {
  /** User ID this memory system belongs to */
  userId: string;

  /** Default importance for new memories */
  defaultImportance?: number;

  /** Default stability for new memories */
  defaultStability?: number;

  /** Minimum retention for retrieval */
  minRetention?: number;

  /** Base decay days by memory type */
  decayRates?: {
    episodic?: number;
    semantic?: number;
    procedural?: number;
  };
}

/**
 * Embedding provider interface
 */
export interface EmbeddingProvider {
  /**
   * Generate embedding vector for text
   */
  embed(text: string): Promise<number[]>;
}
