/**
 * @blah-chat/cognitive-memory
 * 
 * Human-like memory for AI agents with Ebbinghaus decay curves,
 * spaced repetition, and associative linking.
 * 
 * @example
 * ```typescript
 * import { CognitiveMemory, ConvexAdapter } from '@blah-chat/cognitive-memory';
 * 
 * const memory = new CognitiveMemory({
 *   adapter: new ConvexAdapter(convexClient),
 *   embeddingProvider: openai.embeddings,
 *   userId: 'user-123'
 * });
 * 
 * // Store memory
 * await memory.store({
 *   content: "User prefers dark mode",
 *   memoryType: 'semantic',
 *   importance: 0.7
 * });
 * 
 * // Retrieve with decay weighting
 * const results = await memory.retrieve({
 *   query: "UI preferences",
 *   limit: 5
 * });
 * 
 * // Run consolidation (background job)
 * await memory.consolidate();
 * ```
 */

// Core
export { CognitiveMemory } from './core/CognitiveMemory';
export {
  calculateRetention,
  updateStability,
  daysUntilRetention,
  predictRetention,
  calculateReviewSchedule,
  BASE_DECAY_RATES,
} from './core/decay';
export type {
  Memory,
  MemoryType,
  MemoryInput,
  MemoryLink,
  ScoredMemory,
  RetrievalQuery,
  ConsolidationResult,
  DecayParameters,
  CognitiveMemoryConfig,
  EmbeddingProvider,
} from './core/types';

// Adapters
export { MemoryAdapter, BaseMemoryAdapter } from './adapters/base';
export type { MemoryFilters } from './adapters/base';

// Utils
export {
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  createEmbeddingProvider,
} from './utils/embeddings';
export {
  scoreImportance,
  categorizeMemoryType,
  extractTopics,
} from './utils/scoring';
