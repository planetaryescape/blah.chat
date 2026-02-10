/**
 * Convex Adapter for Cognitive Memory
 * 
 * Implements MemoryAdapter interface for Convex database.
 */

import type { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { BaseMemoryAdapter, type MemoryFilters } from './base';
import type { Memory, ScoredMemory } from '../core/types';
import { calculateRetention } from '../core/decay';

/**
 * Convex adapter for cognitive memory
 * 
 * Requires Convex schema extensions:
 * - memories table with cognitive fields (memoryType, stability, accessCount, lastAccessed, retention)
 * - memoryLinks table for associative memory
 * 
 * @example
 * ```typescript
 * const adapter = new ConvexAdapter(convexClient);
 * 
 * const memory = new CognitiveMemory({
 *   adapter,
 *   embeddingProvider: myProvider,
 *   userId: 'user-123'
 * });
 * ```
 */
export class ConvexAdapter extends BaseMemoryAdapter {
  private client: ConvexClient;
  
  constructor(client: ConvexClient) {
    super();
    this.client = client;
  }
  
  async createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    
    // Map to Convex schema format
    const convexMemory = {
      userId: memory.userId as any, // Convex ID type
      content: memory.content,
      embedding: memory.embedding,
      memoryType: memory.memoryType,
      stability: memory.stability,
      accessCount: memory.accessCount,
      lastAccessed: memory.lastAccessed,
      retention: memory.retention,
      metadata: {
        category: memory.metadata?.category || 'user_profile',
        importance: memory.importance * 10, // Convert 0-1 to 1-10 scale
        extractedAt: now,
        confidence: 1.0,
        verifiedBy: 'manual' as const,
      },
      createdAt: now,
      updatedAt: now,
    };
    
    // TODO: Replace with actual Convex mutation call
    // This is a placeholder - need to implement Convex mutations in backend package
    const id = await this.client.mutation(
      'memories:createMemory' as any,
      convexMemory
    );
    
    return id as string;
  }
  
  async getMemory(id: string): Promise<Memory | null> {
    // TODO: Replace with actual Convex query
    const memory = await this.client.query(
      'memories:getMemoryById' as any,
      { id: id as any }
    );
    
    if (!memory) return null;
    
    return this.convexToMemory(memory);
  }
  
  async getMemories(ids: string[]): Promise<Memory[]> {
    // TODO: Replace with actual Convex query
    const memories = await this.client.query(
      'memories:getMemoriesByIds' as any,
      { ids: ids as any[] }
    );
    
    return memories.map((m: any) => this.convexToMemory(m));
  }
  
  async queryMemories(filters: MemoryFilters): Promise<Memory[]> {
    // TODO: Replace with actual Convex query
    const memories = await this.client.query(
      'memories:queryMemories' as any,
      {
        userId: filters.userId as any,
        memoryTypes: filters.memoryTypes,
        minRetention: filters.minRetention,
        minImportance: filters.minImportance,
        createdAfter: filters.createdAfter,
        createdBefore: filters.createdBefore,
        limit: filters.limit,
        offset: filters.offset,
      }
    );
    
    return memories.map((m: any) => this.convexToMemory(m));
  }
  
  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const convexUpdates: any = {
      id: id as any,
      updatedAt: Date.now(),
    };
    
    if (updates.content !== undefined) convexUpdates.content = updates.content;
    if (updates.embedding !== undefined) convexUpdates.embedding = updates.embedding;
    if (updates.memoryType !== undefined) convexUpdates.memoryType = updates.memoryType;
    if (updates.stability !== undefined) convexUpdates.stability = updates.stability;
    if (updates.accessCount !== undefined) convexUpdates.accessCount = updates.accessCount;
    if (updates.lastAccessed !== undefined) convexUpdates.lastAccessed = updates.lastAccessed;
    if (updates.retention !== undefined) convexUpdates.retention = updates.retention;
    if (updates.importance !== undefined) {
      convexUpdates.importance = updates.importance * 10; // Convert to 1-10 scale
    }
    
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memories:updateMemory' as any,
      convexUpdates
    );
  }
  
  async deleteMemory(id: string): Promise<void> {
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memories:deleteMemory' as any,
      { id: id as any }
    );
  }
  
  async deleteMemories(ids: string[]): Promise<void> {
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memories:deleteMemories' as any,
      { ids: ids as any[] }
    );
  }
  
  async vectorSearch(
    embedding: number[],
    filters?: MemoryFilters
  ): Promise<ScoredMemory[]> {
    // TODO: Replace with actual Convex action (vector search)
    const results = await this.client.action(
      'memories:vectorSearch' as any,
      {
        embedding,
        userId: filters?.userId as any,
        memoryTypes: filters?.memoryTypes,
        minRetention: filters?.minRetention,
        limit: filters?.limit || 5,
      }
    );
    
    return results.map((r: any) => ({
      ...this.convexToMemory(r),
      relevanceScore: r.score,
      finalScore: r.score * r.retention,
    }));
  }
  
  async updateRetentionScores(updates: Map<string, number>): Promise<void> {
    const entries = Array.from(updates.entries());
    
    // TODO: Replace with actual Convex mutation (batch update)
    await this.client.mutation(
      'memories:batchUpdateRetention' as any,
      {
        updates: entries.map(([id, retention]) => ({
          id: id as any,
          retention,
        })),
      }
    );
  }
  
  async createOrStrengthenLink(
    sourceId: string,
    targetId: string,
    strength: number
  ): Promise<void> {
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memoryLinks:createOrStrengthen' as any,
      {
        sourceId: sourceId as any,
        targetId: targetId as any,
        strength,
      }
    );
  }
  
  async getLinkedMemories(
    memoryId: string,
    minStrength: number = 0.3
  ): Promise<Array<Memory & { linkStrength: number }>> {
    // TODO: Replace with actual Convex query
    const linked = await this.client.query(
      'memoryLinks:getLinkedMemories' as any,
      {
        memoryId: memoryId as any,
        minStrength,
      }
    );
    
    return linked.map((l: any) => ({
      ...this.convexToMemory(l.memory),
      linkStrength: l.strength,
    }));
  }
  
  async getLinkedMemoriesMultiple(
    memoryIds: string[],
    minStrength: number = 0.3
  ): Promise<Array<Memory & { linkStrength: number }>> {
    // TODO: Replace with actual Convex query
    const linked = await this.client.query(
      'memoryLinks:getLinkedMemoriesMultiple' as any,
      {
        memoryIds: memoryIds as any[],
        minStrength,
      }
    );
    
    return linked.map((l: any) => ({
      ...this.convexToMemory(l.memory),
      linkStrength: l.strength,
    }));
  }
  
  async getLinks(memoryId: string): Promise<any[]> {
    // TODO: Replace with actual Convex query
    return await this.client.query(
      'memoryLinks:getLinks' as any,
      { memoryId: memoryId as any }
    );
  }
  
  async deleteLink(sourceId: string, targetId: string): Promise<void> {
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memoryLinks:deleteLink' as any,
      {
        sourceId: sourceId as any,
        targetId: targetId as any,
      }
    );
  }
  
  async findFadingMemories(
    userId: string,
    maxRetention: number
  ): Promise<Memory[]> {
    // TODO: Replace with actual Convex query
    const memories = await this.client.query(
      'memories:findFading' as any,
      {
        userId: userId as any,
        maxRetention,
      }
    );
    
    return memories.map((m: any) => this.convexToMemory(m));
  }
  
  async findStableMemories(
    userId: string,
    minStability: number,
    minAccessCount: number
  ): Promise<Memory[]> {
    // TODO: Replace with actual Convex query
    const memories = await this.client.query(
      'memories:findStable' as any,
      {
        userId: userId as any,
        minStability,
        minAccessCount,
      }
    );
    
    return memories.map((m: any) => this.convexToMemory(m));
  }
  
  async markSuperseded(
    memoryIds: string[],
    summaryId: string
  ): Promise<void> {
    // TODO: Replace with actual Convex mutation
    await this.client.mutation(
      'memories:markSuperseded' as any,
      {
        memoryIds: memoryIds as any[],
        summaryId: summaryId as any,
      }
    );
  }
  
  /**
   * Convert Convex memory format to SDK Memory type
   * @private
   */
  private convexToMemory(convexMemory: any): Memory {
    return {
      id: convexMemory._id,
      userId: convexMemory.userId,
      content: convexMemory.content,
      embedding: convexMemory.embedding,
      memoryType: convexMemory.memoryType || 'semantic',
      importance: (convexMemory.metadata?.importance || 5) / 10, // Convert 1-10 to 0-1
      stability: convexMemory.stability || 0.3,
      accessCount: convexMemory.accessCount || 0,
      lastAccessed: convexMemory.lastAccessed || convexMemory.createdAt,
      retention: convexMemory.retention || 1.0,
      createdAt: convexMemory.createdAt,
      updatedAt: convexMemory.updatedAt,
      metadata: convexMemory.metadata,
    };
  }
}
