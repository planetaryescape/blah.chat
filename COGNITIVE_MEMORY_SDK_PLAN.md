# Cognitive Memory SDK Implementation Plan

## Overview

Building `@blah-chat/cognitive-memory` package that adds human-like memory (decay, retrieval strengthening, associative linking) to blah.chat.

## Architecture

### Core SDK (Framework-agnostic)

```typescript
// Core interfaces
interface CognitiveMemory {
  store(memory: MemoryInput): Promise<MemoryId>;
  retrieve(query: RetrievalQuery): Promise<Memory[]>;
  consolidate(): Promise<ConsolidationResult>;
  link(sourceId: MemoryId, targetId: MemoryId, strength: number): Promise<void>;
}

interface MemoryAdapter {
  createMemory(data: MemoryData): Promise<MemoryId>;
  getMemories(filters: MemoryFilters): Promise<Memory[]>;
  updateMemory(id: MemoryId, data: Partial<MemoryData>): Promise<void>;
  deleteMemory(id: MemoryId): Promise<void>;
  vectorSearch(embedding: number[], limit: number): Promise<Memory[]>;
}
```

### Convex Adapter

Integrates with existing blah.chat Convex schema. Two approaches:

**Option A: Extend existing memories table**
- Add fields: `stability`, `accessCount`, `lastAccessed`, `memoryType`, `retention`
- Minimal migration, works with existing code
- Gradual adoption

**Option B: New cognitive_memories table**
- Clean separation
- Full control over schema
- Migration path from old to new

**Recommendation: Option A** - extend existing table for easier integration

### Package Structure

```
packages/cognitive-memory/
├── src/
│   ├── index.ts              # Main exports
│   ├── core/
│   │   ├── CognitiveMemory.ts   # Core implementation
│   │   ├── decay.ts             # Ebbinghaus curves
│   │   ├── retrieval.ts         # Retrieval strengthening
│   │   └── types.ts             # TypeScript types
│   ├── adapters/
│   │   ├── base.ts              # Abstract adapter
│   │   └── convex.ts            # Convex implementation
│   └── utils/
│       ├── embeddings.ts        # Embedding helpers
│       └── scoring.ts           # Importance scoring
├── __tests__/
│   ├── core.test.ts
│   ├── decay.test.ts
│   └── convex-adapter.test.ts
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

## Implementation Steps

### Phase 1: Core SDK (No Convex)

1. **Create package structure**
   ```bash
   mkdir -p packages/cognitive-memory/src/{core,adapters,utils}
   mkdir -p packages/cognitive-memory/__tests__
   ```

2. **Implement core types** (`src/core/types.ts`)
   - MemoryType: episodic | semantic | procedural
   - Memory interface with decay metadata
   - Retrieval query interface
   - Consolidation types

3. **Implement decay calculations** (`src/core/decay.ts`)
   - `calculateRetention(stability, importance, lastAccessed): number`
   - `updateStability(currentStability, daysSinceLastAccess): number`
   - Constants for decay rates by memory type

4. **Implement abstract adapter** (`src/adapters/base.ts`)
   - Interface that Convex will implement
   - Methods: create, update, delete, search, getById, etc.

5. **Implement CognitiveMemory class** (`src/core/CognitiveMemory.ts`)
   - Constructor takes adapter + embedding provider
   - store() - stores memory with embedding
   - retrieve() - searches and applies decay weighting
   - consolidate() - identifies fading memories, compresses
   - link() - creates associative links

6. **Write tests**
   - Mock adapter for testing
   - Test decay calculations
   - Test retrieval weighting
   - Test consolidation logic

### Phase 2: Convex Adapter

7. **Extend Convex schema** (in `packages/backend/convex/schema.ts`)
   ```typescript
   memories: defineTable({
     // ... existing fields ...
     // Add cognitive memory fields:
     memoryType: v.optional(v.union(
       v.literal("episodic"),
       v.literal("semantic"),
       v.literal("procedural")
     )),
     stability: v.optional(v.number()),      // 0.0-1.0
     accessCount: v.optional(v.number()),     // retrieval count
     lastAccessed: v.optional(v.number()),    // timestamp
     retention: v.optional(v.number()),       // cached retention score
   })
   ```

8. **Create Convex adapter** (`src/adapters/convex.ts`)
   - Implements MemoryAdapter interface
   - Maps to Convex mutations/queries/actions
   - Handles vector search via Convex actions
   - Updates stability/accessCount on retrieval

9. **Create Convex mutations for cognitive memory**
   - `packages/backend/convex/memories/cognitive.ts`
   - Mutations: updateStability, updateRetention
   - Queries: getWithDecay, searchWithDecay
   - Actions: consolidate, linkMemories

10. **Add consolidation cron**
    - Run daily consolidation in background
    - Identify fading memories (retention < 0.2)
    - Compress similar memories
    - Update retention cache

### Phase 3: Integration Example

11. **Create integration branch**
    - Branch from SDK work
    - Show real usage in chat interface

12. **Wire up to chat flow**
    - On new message: check if memory-worthy
    - Extract + store with importance scoring
    - On message generation: retrieve relevant memories
    - Apply decay weighting to context

13. **Update UI**
    - Show memories in sidebar with decay indicators
    - Visual representation of stability/retention
    - Allow manual memory creation
    - "Related memories" section

14. **Add settings**
    - User preferences for memory aggressiveness
    - Decay rate customization
    - Manual consolidation trigger

### Phase 4: Documentation

15. **Package README**
    - Installation
    - Quick start
    - API documentation
    - Adapter pattern explanation
    - Examples

16. **Integration guide**
    - How to add to existing apps
    - Convex setup steps
    - Migration from simple memory

17. **API docs**
    - TypeDoc generation
    - Publish to docs site

## Key Design Decisions

### Decay Formula
```typescript
const daysSinceAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24);
const importanceBoost = 1 + (importance * 2);
const baseDecay = memoryType === 'episodic' ? 30 : 
                  memoryType === 'semantic' ? 90 : 
                  Infinity; // procedural doesn't decay
const decayConstant = stability * importanceBoost * baseDecay;
const retention = Math.exp(-daysSinceAccess / decayConstant);
```

### Retrieval Strengthening
```typescript
const daysSinceLastAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24);
const spacingBonus = Math.min(2.0, daysSinceLastAccess / 7);
const newStability = Math.min(1.0, stability + 0.1 * spacingBonus);
```

### Retrieval Scoring
```typescript
const relevanceScore = cosineSimilarity(queryEmbedding, memoryEmbedding);
const retentionScore = calculateRetention(memory);
const finalScore = relevanceScore * retentionScore;
// Sort by finalScore descending
```

### Associative Linking
- Memories retrieved together in same session get linked
- Link strength starts at 0.5
- Each co-retrieval adds 0.1 to strength (max 1.0)
- When retrieving, include linked memories with strength > 0.3

## Testing Strategy

1. **Unit tests:** Core calculations (decay, stability)
2. **Integration tests:** Convex adapter with test database
3. **E2E tests:** Full flow in blah.chat
4. **Performance tests:** Large memory sets, retrieval speed

## Migration Strategy

For existing blah.chat users:

1. **Backfill cognitive fields**
   - Set memoryType based on category/metadata
   - Initialize stability = 0.3 (default)
   - Set accessCount = 0
   - Set lastAccessed = createdAt

2. **Gradual rollout**
   - Feature flag: enable for new users first
   - Monitor performance/behavior
   - Roll out to existing users once stable

3. **Backward compatibility**
   - Existing code still works (fields are optional)
   - Cognitive features enhance, don't replace

## Success Metrics

- Memory retrieval relevance improves (user feedback)
- Important memories stay accessible
- Trivial memories naturally fade
- Database size doesn't explode (consolidation works)
- Chat quality improves (better context)

## Deliverables

1. **PR 1 (SDK + Convex Adapter):** 
   - New package with core + adapter
   - Extended Convex schema
   - Tests passing
   - README with usage

2. **PR 2 (Integration Example):**
   - Based on PR 1 branch
   - Working integration in chat
   - UI showing memories + decay
   - Demo video/screenshots

---

**Ready to build.** Starting with Phase 1 using Claude Code.
