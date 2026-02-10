/**
 * Migration: Add Cognitive Memory Fields
 * 
 * Extends the memories table with fields for Ebbinghaus decay,
 * spaced repetition, and retrieval strengthening.
 * 
 * New fields:
 * - memoryType: 'episodic' | 'semantic' | 'procedural'
 * - stability: number (0.0-1.0, grows with retrievals)
 * - accessCount: number (how many times accessed)
 * - lastAccessed: number (timestamp)
 * - retention: number (0.0-1.0, cached decay score)
 * 
 * Run with: `npx convex run migrations/add_cognitive_memory_fields:migrate`
 */

import { internalMutation } from "../_generated/server";
import { calculateRetention } from "@blah-chat/cognitive-memory";

export const migrate = internalMutation({
  handler: async (ctx) => {
    const memories = await ctx.db.query("memories").collect();
    
    let updated = 0;
    
    for (const memory of memories) {
      // Skip if already has cognitive fields
      if ('memoryType' in memory) {
        continue;
      }
      
      // Determine memory type based on existing metadata
      let memoryType: 'episodic' | 'semantic' | 'procedural' = 'semantic'; // default
      
      const category = memory.metadata?.category?.toLowerCase() || '';
      if (category.includes('event') || category.includes('conversation')) {
        memoryType = 'episodic';
      } else if (category.includes('skill') || category.includes('how-to')) {
        memoryType = 'procedural';
      }
      
      // Initialize cognitive fields
      const now = Date.now();
      const stability = 0.3; // default initial stability
      const accessCount = 0;
      const lastAccessed = memory.createdAt; // use creation time
      
      // Calculate initial retention
      const retention = calculateRetention({
        stability,
        importance: (memory.metadata?.importance || 5) / 10, // normalize 1-10 to 0-1
        lastAccessed,
        memoryType
      });
      
      await ctx.db.patch(memory._id, {
        memoryType,
        stability,
        accessCount,
        lastAccessed,
        retention
      });
      
      updated++;
    }
    
    return {
      success: true,
      memoriesUpdated: updated,
      totalMemories: memories.length
    };
  }
});

/**
 * Backfill script: Update retention scores for all existing memories
 * Run periodically to refresh retention scores based on current formulas.
 */
export const backfillRetentionScores = internalMutation({
  handler: async (ctx) => {
    const memories = await ctx.db.query("memories").collect();
    
    let updated = 0;
    
    for (const memory of memories) {
      // Skip if missing cognitive fields
      if (!('memoryType' in memory)) {
        continue;
      }
      
      // Recalculate retention
      const retention = calculateRetention({
        stability: memory.stability,
        importance: (memory.metadata?.importance || 5) / 10,
        lastAccessed: memory.lastAccessed,
        memoryType: memory.memoryType
      });
      
      if (Math.abs(retention - memory.retention) > 0.01) {
        await ctx.db.patch(memory._id, { retention });
        updated++;
      }
    }
    
    return {
      success: true,
      scoresUpdated: updated,
      totalMemories: memories.length
    };
  }
});
