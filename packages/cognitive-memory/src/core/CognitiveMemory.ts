/**
 * Cognitive Memory System - Main Class
 * 
 * High-level API for cognitive memory with decay, retrieval strengthening,
 * and associative linking.
 */

import type { MemoryAdapter } from '../adapters/base';
import type {
  CognitiveMemoryConfig,
  ConsolidationResult,
  EmbeddingProvider,
  Memory,
  MemoryInput,
  RetrievalQuery,
  ScoredMemory,
} from './types';
import { calculateRetention, updateStability } from './decay';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<CognitiveMemoryConfig, 'userId'>> = {
  defaultImportance: 0.5,
  defaultStability: 0.3,
  minRetention: 0.2,
  decayRates: {
    episodic: 30,
    semantic: 90,
    procedural: Infinity,
  },
};

/**
 * Main cognitive memory system
 * 
 * Provides high-level API for storing, retrieving, and managing memories
 * with human-like characteristics: decay, retrieval strengthening, and
 * associative linking.
 * 
 * @example
 * ```typescript
 * const memory = new CognitiveMemory({
 *   adapter: new ConvexAdapter(client),
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
 * ```
 */
export class CognitiveMemory {
  private adapter: MemoryAdapter;
  private embeddingProvider: EmbeddingProvider;
  private config: Required<CognitiveMemoryConfig>;
  
  constructor(options: {
    adapter: MemoryAdapter;
    embeddingProvider: EmbeddingProvider;
    userId: string;
    config?: Partial<CognitiveMemoryConfig>;
  }) {
    this.adapter = options.adapter;
    this.embeddingProvider = options.embeddingProvider;
    this.config = {
      userId: options.userId,
      ...DEFAULT_CONFIG,
      ...options.config,
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
    // Generate embedding
    const embedding = await this.embeddingProvider.embed(input.content);
    
    // Prepare memory data
    const now = Date.now();
    const memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: this.config.userId,
      content: input.content,
      embedding,
      memoryType: input.memoryType || 'semantic',
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
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embed(queryText);
    
    // Vector search (get 3x candidates for better filtering)
    const candidates = await this.adapter.vectorSearch(queryEmbedding, {
      userId: this.config.userId,
      memoryTypes,
      minRetention,
      limit: limit * 3,
    });
    
    // Calculate final scores (already have relevanceScore from vectorSearch)
    // Final score = relevance × retention
    const scored = candidates.map(memory => ({
      ...memory,
      finalScore: memory.relevanceScore * memory.retention,
    }));
    
    // Sort by final score
    scored.sort((a, b) => b.finalScore - a.finalScore);
    
    // Take top results
    const topResults = scored.slice(0, limit);
    
    // Strengthen these memories (retrieval effect)
    await this.strengthenMemories(topResults);
    
    // Get associated memories if requested
    if (includeAssociations && topResults.length > 0) {
      const associated = await this.adapter.getLinkedMemoriesMultiple(
        topResults.map(m => m.id),
        0.3 // Minimum link strength
      );
      
      // Add associated memories to results (if not already included)
      const resultIds = new Set(topResults.map(m => m.id));
      for (const assoc of associated) {
        if (!resultIds.has(assoc.id)) {
          // Calculate scores for associated memory
          const retention = calculateRetention({
            stability: assoc.stability,
            importance: assoc.importance,
            lastAccessed: assoc.lastAccessed,
            memoryType: assoc.memoryType,
          });
          
          topResults.push({
            ...assoc,
            relevanceScore: assoc.linkStrength, // Use link strength as relevance
            retention,
            finalScore: assoc.linkStrength * retention,
          });
        }
      }
      
      // Re-sort with associated memories included
      topResults.sort((a, b) => b.finalScore - a.finalScore);
    }
    
    // Strengthen links between co-retrieved memories
    await this.strengthenLinks(topResults.map(m => m.id));
    
    return topResults;
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
   * Update a memory's content
   * 
   * Regenerates embedding and updates metadata.
   * 
   * @param id Memory ID
   * @param content New content
   */
  async update(id: string, content: string): Promise<void> {
    const memory = await this.adapter.getMemory(id);
    if (!memory) {
      throw new Error(`Memory ${id} not found`);
    }
    
    // Generate new embedding
    const embedding = await this.embeddingProvider.embed(content);
    
    // Update memory
    await this.adapter.updateMemory(id, {
      content,
      embedding,
      updatedAt: Date.now(),
    });
  }
  
  /**
   * Delete a memory
   * 
   * @param id Memory ID
   */
  async delete(id: string): Promise<void> {
    await this.adapter.deleteMemory(id);
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
    
    // 1. Find fading memories (retention < 0.2)
    const fading = await this.adapter.findFadingMemories(
      this.config.userId,
      0.2
    );
    
    result.decayed = fading.map(m => ({
      id: m.id,
      retention: m.retention,
    }));
    
    // 2. Group fading memories by similarity for compression
    // (Simplified: group by first topic/keyword)
    const groups = new Map<string, Memory[]>();
    for (const memory of fading) {
      const topic = this.extractPrimaryTopic(memory);
      if (!groups.has(topic)) {
        groups.set(topic, []);
      }
      groups.get(topic)!.push(memory);
    }
    
    // 3. Compress groups with 5+ similar memories
    for (const [topic, memories] of groups) {
      if (memories.length >= 5) {
        const summary = await this.summarizeMemories(memories);
        
        // Store compressed memory
        const summaryId = await this.store({
          content: summary,
          memoryType: 'semantic',
          importance: Math.max(...memories.map(m => m.importance)),
          metadata: {
            compressed: true,
            sourceCount: memories.length,
            topic,
          },
        });
        
        // Mark originals as superseded
        await this.adapter.markSuperseded(
          memories.map(m => m.id),
          summaryId
        );
        
        result.compressed.push({
          summaryId,
          originalIds: memories.map(m => m.id),
          count: memories.length,
        });
      }
    }
    
    // 4. Find high-stability memories for promotion
    const stable = await this.adapter.findStableMemories(
      this.config.userId,
      0.9,
      10
    );
    
    result.promotionCandidates = stable.map(m => ({
      id: m.id,
      stability: m.stability,
      accessCount: m.accessCount,
    }));
    
    // 5. Soft delete very low retention memories (< 0.05 for 30+ days)
    const veryFaded = await this.adapter.queryMemories({
      userId: this.config.userId,
      minRetention: 0,
    });
    
    const toDelete = veryFaded.filter(m => {
      const daysSinceAccess = (Date.now() - m.lastAccessed) / (1000 * 60 * 60 * 24);
      return m.retention < 0.05 && daysSinceAccess > 30;
    });
    
    if (toDelete.length > 0) {
      await this.adapter.deleteMemories(toDelete.map(m => m.id));
      result.deleted = toDelete.length;
    }
    
    return result;
  }
  
  /**
   * Create a link between two memories
   * 
   * @param sourceId Source memory ID
   * @param targetId Target memory ID
   * @param strength Link strength (0.0-1.0)
   */
  async link(sourceId: string, targetId: string, strength: number = 0.5): Promise<void> {
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
      const daysSinceAccess = (now - memory.lastAccessed) / (1000 * 60 * 60 * 24);
      
      // Update stability
      const newStability = updateStability(memory.stability, daysSinceAccess);
      
      // Recalculate retention
      const newRetention = calculateRetention({
        stability: newStability,
        importance: memory.importance,
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
    
    // Batch update
    for (const { id, updates: memoryUpdates } of updates) {
      await this.adapter.updateMemory(id, memoryUpdates);
    }
  }
  
  /**
   * Strengthen links between co-retrieved memories
   * 
   * @private
   */
  private async strengthenLinks(memoryIds: string[]): Promise<void> {
    // Create/strengthen links between all pairs
    for (let i = 0; i < memoryIds.length; i++) {
      for (let j = i + 1; j < memoryIds.length; j++) {
        await this.adapter.createOrStrengthenLink(
          memoryIds[i],
          memoryIds[j],
          0.1 // Increment strength by 0.1
        );
      }
    }
  }
  
  /**
   * Extract primary topic from memory (simplified)
   * 
   * @private
   */
  private extractPrimaryTopic(memory: Memory): string {
    // Simplified: use first word of content
    // Production: use LLM or NLP for better topic extraction
    const words = memory.content.toLowerCase().split(/\s+/);
    return words[0] || 'misc';
  }
  
  /**
   * Summarize multiple memories into one gist
   * 
   * @private
   */
  private async summarizeMemories(memories: Memory[]): Promise<string> {
    // Simplified: concatenate and truncate
    // Production: use LLM for intelligent summarization
    const combined = memories.map(m => m.content).join('. ');
    return combined.length > 500
      ? combined.slice(0, 497) + '...'
      : combined;
  }
}
