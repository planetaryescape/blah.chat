# Cognitive Memory System - Technical Specification

> **Historical (Convex era).** The app now runs on Postgres + Drizzle (packages/persistence-postgres) with Trigger.dev jobs (packages/jobs). Kept for design rationale; file paths and code samples below no longer apply. Only the Postgres adapter (`packages/cognitive-memory/src/adapters/postgres.ts`) exists today; any Convex adapter described below was removed.

**Version:** 1.0  
**Date:** 2026-02-10  
**Status:** Implementation  
**Author:** Shallan / BK

---

## Executive Summary

This document specifies the implementation of a cognitive memory system for blah.chat that mimics human memory characteristics: Ebbinghaus decay curves, spaced repetition (retrieval strengthening), and associative memory linking.

**Goal:** Enable AI to remember what matters, forget what doesn't, and prioritize based on recency, importance, and access patterns—not just semantic similarity.

---

## 1. System Architecture

### 1.1 Package Structure

```
packages/cognitive-memory/
├── src/
│   ├── core/
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── decay.ts              # Decay calculations
│   │   ├── CognitiveMemory.ts    # Main class
│   │   └── index.ts              # Core exports
│   ├── adapters/
│   │   ├── base.ts               # Abstract adapter interface
│   │   ├── convex.ts             # Convex implementation
│   │   └── index.ts              # Adapter exports
│   ├── utils/
│   │   ├── embeddings.ts         # Vector operations
│   │   ├── scoring.ts            # Importance scoring
│   │   └── index.ts              # Utils exports
│   └── index.ts                  # Main package exports
├── __tests__/
│   ├── decay.test.ts             # Decay formula tests
│   ├── CognitiveMemory.test.ts   # Integration tests
│   └── adapters/
│       └── convex.test.ts        # Adapter tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 1.2 Dependencies

**Required:**
- TypeScript 5.x
- No required runtime dependencies (core is pure TS)

**Peer Dependencies (optional):**
- `convex` >= 1.0.0 (for Convex adapter)

**Dev Dependencies:**
- `vitest` for testing
- `tsup` for building
- `typescript` for type checking

---

## 2. Core Types

### 2.1 Memory Interface

```typescript
interface Memory {
  id: string;                    // Unique identifier
  userId: string;                // Owner of this memory
  content: string;               // Memory text
  embedding: number[];           // Vector embedding (1536 dimensions)
  
  // Cognitive fields
  memoryType: MemoryType;        // episodic | semantic | procedural
  importance: number;            // 0.0-1.0 (significance)
  stability: number;             // 0.0-1.0 (grows with retrievals)
  accessCount: number;           // Number of times accessed
  lastAccessed: number;          // Timestamp (milliseconds)
  retention: number;             // 0.0-1.0 (cached decay score)
  
  // Timestamps
  createdAt: number;             // Creation timestamp
  updatedAt: number;             // Last update timestamp
  
  // Optional
  metadata?: Record<string, any>; // Additional data
}
```

**Validation Rules:**
- `importance` must be in range [0.0, 1.0]
- `stability` must be in range [0.0, 1.0]
- `retention` must be in range [0.0, 1.0]
- `accessCount` must be non-negative integer
- `lastAccessed` must be valid timestamp
- `embedding` must be array of numbers (typically 1536 dimensions for OpenAI)

### 2.2 Memory Types

```typescript
type MemoryType = 'episodic' | 'semantic' | 'procedural';
```

**Characteristics:**

| Type | Description | Base Decay | Use Case |
|------|-------------|------------|----------|
| `episodic` | Events with time/place context | 30 days | "Yesterday I met with Sarah" |
| `semantic` | Facts without temporal context | 90 days | "User prefers dark mode" |
| `procedural` | Skills, how-to knowledge | Never | "How to format code" |

### 2.3 Configuration

```typescript
interface CognitiveMemoryConfig {
  userId: string;                // Required
  defaultImportance?: number;    // Default: 0.5
  defaultStability?: number;     // Default: 0.3
  minRetention?: number;         // Default: 0.2
  decayRates?: {
    episodic?: number;           // Default: 30 days
    semantic?: number;           // Default: 90 days
    procedural?: number;         // Default: Infinity
  };
}
```

---

## 3. Decay Calculations

### 3.1 Retention Formula

**Mathematical Definition:**

```
retention = e^(-t / (S × I × D))

Where:
  t = days since last access = (now - lastAccessed) / (1000 × 60 × 60 × 24)
  S = stability (0.0-1.0)
  I = importance boost = 1 + (importance × 2)
  D = base decay (memoryType specific)
```

**Implementation Requirements:**

```typescript
function calculateRetention(params: DecayParameters): number {
  const { stability, importance, lastAccessed, memoryType } = params;
  
  // 1. Handle procedural (never decays)
  if (memoryType === 'procedural') {
    return 1.0;
  }
  
  // 2. Calculate days since access
  const now = Date.now();
  const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);
  
  // 3. Calculate importance boost (1.0 to 3.0)
  const importanceBoost = 1.0 + (importance * 2.0);
  
  // 4. Get base decay rate
  const BASE_DECAY_RATES = {
    episodic: 30,
    semantic: 90,
    procedural: Infinity
  };
  const baseDecay = BASE_DECAY_RATES[memoryType];
  
  // 5. Combined decay constant
  const decayConstant = stability * importanceBoost * baseDecay;
  
  // 6. Handle edge case (very low stability)
  if (decayConstant < 0.1) {
    return Math.max(0, 1.0 - (daysSinceAccess / 10));
  }
  
  // 7. Exponential decay (Ebbinghaus curve)
  const retention = Math.exp(-daysSinceAccess / decayConstant);
  
  // 8. Clamp to [0, 1]
  return Math.max(0, Math.min(1, retention));
}
```

**Test Cases:**

| Scenario | Stability | Importance | Days | Type | Expected Retention |
|----------|-----------|------------|------|------|-------------------|
| Fresh memory | 0.3 | 0.5 | 1 | episodic | ~0.97 |
| Week-old memory | 0.3 | 0.5 | 7 | episodic | ~0.78 |
| Month-old memory | 0.3 | 0.5 | 30 | episodic | ~0.37 |
| High importance | 0.5 | 0.9 | 30 | semantic | ~0.87 |
| Procedural | any | any | any | procedural | 1.0 |

### 3.2 Stability Update (Spaced Repetition)

**Mathematical Definition:**

```
new_stability = min(1.0, old_stability + Δstability)

Where:
  Δstability = 0.1 × spacing_bonus
  spacing_bonus = min(2.0, days_since_last_access / 7)
```

**Implementation Requirements:**

```typescript
function updateStability(
  currentStability: number,
  daysSinceLastAccess: number
): number {
  // 1. Calculate spacing bonus (capped at 2.0)
  const spacingBonus = Math.min(2.0, daysSinceLastAccess / 7);
  
  // 2. Base increase is 0.1
  const stabilityIncrease = 0.1 * spacingBonus;
  
  // 3. Add to current
  const newStability = currentStability + stabilityIncrease;
  
  // 4. Cap at 1.0
  return Math.min(1.0, newStability);
}
```

**Test Cases:**

| Current | Days Since | Expected New | Reasoning |
|---------|-----------|--------------|-----------|
| 0.3 | 1 | 0.314 | Small bonus (~0.014) |
| 0.3 | 7 | 0.4 | Full 0.1 increase |
| 0.3 | 14 | 0.5 | Max bonus (0.2) |
| 0.95 | 7 | 1.0 | Capped at max |

### 3.3 Retrieval Scoring

**Formula:**

```
finalScore = relevanceScore × retentionScore

Where:
  relevanceScore = cosine_similarity(query_embedding, memory_embedding)
  retentionScore = calculateRetention(memory)
```

**Requirements:**
1. Vector search returns candidates with relevance scores
2. Calculate retention for each candidate
3. Multiply scores
4. Sort by final score descending
5. Return top N results

**Example:**

```
Memory A: relevance=0.92, retention=0.97 → final=0.89
Memory B: relevance=0.91, retention=0.45 → final=0.41
Result: A ranks 2.2x higher despite nearly identical relevance
```

---

## 4. Adapter Interface

### 4.1 Abstract Base

```typescript
abstract class MemoryAdapter {
  // CRUD operations
  abstract createMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  abstract getMemory(id: string): Promise<Memory | null>;
  abstract getMemories(ids: string[]): Promise<Memory[]>;
  abstract updateMemory(id: string, updates: Partial<Memory>): Promise<void>;
  abstract deleteMemory(id: string): Promise<void>;
  abstract deleteMemories(ids: string[]): Promise<void>;
  
  // Query operations
  abstract queryMemories(filters: MemoryFilters): Promise<Memory[]>;
  abstract vectorSearch(embedding: number[], filters?: MemoryFilters): Promise<ScoredMemory[]>;
  
  // Bulk operations
  abstract updateRetentionScores(updates: Map<string, number>): Promise<void>;
  
  // Associative memory
  abstract createOrStrengthenLink(sourceId: string, targetId: string, strength: number): Promise<void>;
  abstract getLinkedMemories(memoryId: string, minStrength?: number): Promise<Array<Memory & { linkStrength: number }>>;
  abstract getLinkedMemoriesMultiple(memoryIds: string[], minStrength?: number): Promise<Array<Memory & { linkStrength: number }>>;
  abstract deleteLink(sourceId: string, targetId: string): Promise<void>;
  
  // Consolidation helpers
  abstract findFadingMemories(userId: string, maxRetention: number): Promise<Memory[]>;
  abstract findStableMemories(userId: string, minStability: number, minAccessCount: number): Promise<Memory[]>;
  abstract markSuperseded(memoryIds: string[], summaryId: string): Promise<void>;
  
  // Optional: Transaction support
  abstract transaction<T>(callback: (adapter: MemoryAdapter) => Promise<T>): Promise<T>;
}
```

**Contract:**
- All methods must handle errors gracefully
- `vectorSearch` must return memories with `relevanceScore` field populated
- Link strength must be in range [0.0, 1.0]
- All timestamp fields must be in milliseconds since epoch

### 4.2 Convex Adapter Requirements

**Schema Extensions:**

```typescript
// memories table additions:
{
  memoryType: v.optional(v.union(
    v.literal("episodic"),
    v.literal("semantic"),
    v.literal("procedural")
  )),
  stability: v.optional(v.number()),
  accessCount: v.optional(v.number()),
  lastAccessed: v.optional(v.number()),
  retention: v.optional(v.number()),
}

// New table: memoryLinks
{
  sourceId: v.id("memories"),
  targetId: v.id("memories"),
  strength: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}
```

**Required Indexes:**
- `memories.by_retention` on `[userId, retention]`
- `memories.by_stability` on `[userId, stability]`
- `memoryLinks.by_source` on `[sourceId]`
- `memoryLinks.by_target` on `[targetId]`
- `memoryLinks.by_source_strength` on `[sourceId, strength]`

**Implementation Notes:**
- Map SDK `importance` (0-1) to Convex `metadata.importance` (1-10): `convex = sdk * 10`
- Handle Convex ID types properly (cast to/from string)
- Use Convex actions for vector search (requires embeddings)
- Implement batch operations efficiently

---

## 5. CognitiveMemory Class

### 5.1 Constructor

```typescript
constructor(options: {
  adapter: MemoryAdapter;
  embeddingProvider: EmbeddingProvider;
  userId: string;
  config?: Partial<CognitiveMemoryConfig>;
})
```

**Behavior:**
- Merge provided config with defaults
- Validate userId is non-empty
- Store references to adapter and embedding provider

### 5.2 Core Methods

#### 5.2.1 store()

```typescript
async store(input: MemoryInput): Promise<string>
```

**Steps:**
1. Generate embedding for content
2. Apply defaults for missing fields:
   - `importance` → config.defaultImportance (0.5)
   - `stability` → config.defaultStability (0.3)
   - `memoryType` → 'semantic'
   - `accessCount` → 0
   - `lastAccessed` → now
   - `retention` → 1.0 (fresh)
3. Call adapter.createMemory()
4. Return memory ID

**Validation:**
- Content must be non-empty string
- Importance must be [0, 1] if provided
- Stability must be [0, 1] if provided

#### 5.2.2 retrieve()

```typescript
async retrieve(query: RetrievalQuery): Promise<ScoredMemory[]>
```

**Steps:**
1. Generate query embedding
2. Vector search with limit × 3 (over-fetch for filtering)
3. Calculate final scores (relevance × retention)
4. Sort by final score descending
5. Take top N
6. **Strengthen retrieved memories** (update stability, accessCount, lastAccessed)
7. If `includeAssociations === true`:
   - Get linked memories (minStrength 0.3)
   - Calculate scores for linked memories
   - Add to results (deduplicate by ID)
   - Re-sort
8. **Strengthen links** between co-retrieved memories
9. Return results

**Parameters:**
- `query` (required): Search text
- `limit` (default: 5): Max results
- `minRetention` (default: config.minRetention): Filter threshold
- `memoryTypes` (optional): Filter by types
- `includeAssociations` (default: true): Include linked memories

#### 5.2.3 get()

```typescript
async get(id: string): Promise<Memory | null>
```

**Steps:**
1. Call adapter.getMemory(id)
2. If found, strengthen the memory (same as retrieve)
3. Return memory

#### 5.2.4 update()

```typescript
async update(id: string, content: string): Promise<void>
```

**Steps:**
1. Get existing memory
2. Generate new embedding
3. Update memory with new content, embedding, and updatedAt
4. Call adapter.updateMemory()

#### 5.2.5 consolidate()

```typescript
async consolidate(): Promise<ConsolidationResult>
```

**Steps:**
1. Find fading memories (retention < 0.2)
2. Group by similarity/topic
3. For groups with 5+ memories:
   - Summarize into one memory
   - Store summary
   - Mark originals as superseded
4. Find stable memories (stability > 0.9, accessCount > 10)
5. Find very stale memories (retention < 0.05 for 30+ days)
6. Delete stale memories
7. Return results with counts

**Result:**
```typescript
{
  decayed: Array<{ id, retention }>,
  compressed: Array<{ summaryId, originalIds, count }>,
  promotionCandidates: Array<{ id, stability, accessCount }>,
  deleted: number
}
```

#### 5.2.6 link()

```typescript
async link(sourceId: string, targetId: string, strength: number = 0.5): Promise<void>
```

**Steps:**
1. Validate strength is [0, 1]
2. Call adapter.createOrStrengthenLink()

### 5.3 Private Helper Methods

#### strengthenMemories()

```typescript
private async strengthenMemories(memories: Memory[]): Promise<void>
```

For each memory:
1. Calculate days since last access
2. Update stability using spaced repetition formula
3. Increment accessCount
4. Set lastAccessed to now
5. Recalculate retention
6. Batch update via adapter

#### strengthenLinks()

```typescript
private async strengthenLinks(memoryIds: string[]): Promise<void>
```

For all pairs (i, j) where i < j:
- Call adapter.createOrStrengthenLink(ids[i], ids[j], 0.1)
- If link exists, strength increases by 0.1 (capped at 1.0)

---

## 6. Utility Functions

### 6.1 Vector Operations

```typescript
// embeddings.ts

function cosineSimilarity(a: number[], b: number[]): number
// Requirements:
// - Validate equal length
// - Return dot(a,b) / (||a|| × ||b||)
// - Handle zero-magnitude edge case

function euclideanDistance(a: number[], b: number[]): number
// Requirements:
// - Validate equal length
// - Return sqrt(sum((a[i] - b[i])²))

function normalizeVector(vector: number[]): number[]
// Requirements:
// - Return vector / ||vector||
// - Handle zero-magnitude edge case
```

### 6.2 Scoring Heuristics

```typescript
// scoring.ts

function scoreImportance(text: string): number
// Heuristic scoring (0-1) based on:
// - Length (longer = potentially more important)
// - Decision words (decided, chose, will, must)
// - Personal markers (I, my, we, our)
// - Temporal markers (yesterday, tomorrow)
// - Sentiment words (love, hate, critical, urgent)
// Base score: 0.3, max: 1.0

function categorizeMemoryType(text: string): MemoryType
// Heuristic classification:
// - Procedural: "how to", "step 1", instructions
// - Episodic: temporal markers, past tense
// - Semantic: default

function extractTopics(text: string, maxTopics: number = 5): string[]
// Simple frequency-based extraction
// - Remove stop words
// - Count word frequency
// - Return top N
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

**decay.test.ts:**
- ✅ Procedural memories never decay (retention = 1.0)
- ✅ Fresh memory has high retention (~0.97)
- ✅ Old memory has low retention
- ✅ High importance slows decay
- ✅ High stability slows decay
- ✅ updateStability increases correctly
- ✅ Spacing bonus works (7 days = 1x, 14 days = 2x)
- ✅ Stability caps at 1.0
- ✅ Edge cases (zero stability, negative days, etc.)

**CognitiveMemory.test.ts:**
- ✅ store() creates memory with defaults
- ✅ retrieve() returns scored results
- ✅ retrieve() strengthens memories
- ✅ retrieve() includes associations when enabled
- ✅ retrieve() strengthens links
- ✅ get() strengthens single memory
- ✅ update() regenerates embedding
- ✅ consolidate() groups and compresses
- ✅ consolidate() deletes stale memories
- ✅ link() creates associations

**embeddings.test.ts:**
- ✅ cosineSimilarity returns 1.0 for identical vectors
- ✅ cosineSimilarity returns 0.0 for orthogonal vectors
- ✅ euclideanDistance works correctly
- ✅ normalizeVector produces unit length

### 7.2 Integration Tests

**Adapter tests (convex.test.ts):**
- ✅ Full CRUD lifecycle
- ✅ Vector search returns scores
- ✅ Batch operations work
- ✅ Link operations work
- ✅ Query filters work
- ✅ Type conversions are correct

### 7.3 Test Coverage Requirements

- Line coverage: ≥ 80%
- Branch coverage: ≥ 75%
- All public methods must have tests
- All error paths must have tests

---

## 8. Error Handling

### 8.1 Validation Errors

**Throw when:**
- Invalid importance/stability/retention (outside [0, 1])
- Empty content string
- Invalid memory type
- Negative accessCount
- Invalid timestamp

**Error format:**
```typescript
throw new Error(`Invalid ${field}: ${value} (must be ${constraint})`);
```

### 8.2 Adapter Errors

**Handle gracefully:**
- Database connection failures → retry with backoff
- Not found errors → return null
- Duplicate key errors → update instead of insert (for links)

**Propagate:**
- Unexpected errors → throw with context

### 8.3 Embedding Errors

**Handle:**
- API failures → retry with exponential backoff (3 attempts)
- Rate limits → wait and retry
- Invalid responses → throw with context

---

## 9. Performance Requirements

### 9.1 Latency

- `store()`: < 500ms (p95)
- `retrieve()`: < 300ms (p95)
- `get()`: < 100ms (p95)
- `consolidate()`: < 5s (p95)

### 9.2 Throughput

- Support 100 concurrent store operations
- Support 1000 concurrent retrieve operations
- Batch operations should be 10x faster than sequential

### 9.3 Memory

- SDK should use < 10MB RAM baseline
- No memory leaks (test with 10K operations)

### 9.4 Database

- Vector search should use indexes
- Batch updates should use transactions when available
- Link queries should use indexes (by_source, by_target)

---

## 10. Backwards Compatibility

### 10.1 Migration

Existing blah.chat memories need backfilling:

```typescript
// Migration script requirements
async function migrateExistingMemories() {
  for each memory:
    - Set memoryType based on metadata.category
    - Set stability = 0.3 (default)
    - Set accessCount = 0
    - Set lastAccessed = createdAt
    - Calculate initial retention
    - Update memory
}
```

### 10.2 Schema Extensions

All new fields must be optional in Convex schema:
- Code without cognitive fields continues to work
- Queries filter by field existence when needed

---

## 11. API Documentation

### 11.1 JSDoc Requirements

All public methods must have:
- Description of what it does
- `@param` for each parameter with type and description
- `@returns` with type and description
- `@throws` if method can throw
- `@example` with working code snippet

**Example:**
```typescript
/**
 * Store a new memory with automatic embedding generation.
 * 
 * @param input - Memory content and optional metadata
 * @returns Promise resolving to the created memory ID
 * @throws {Error} If content is empty or importance/stability out of range
 * 
 * @example
 * ```typescript
 * const id = await memory.store({
 *   content: "User prefers dark mode",
 *   memoryType: 'semantic',
 *   importance: 0.7
 * });
 * ```
 */
async store(input: MemoryInput): Promise<string>
```

### 11.2 README Requirements

Must include:
- Quick start example
- Installation instructions
- API reference (all public methods)
- Configuration options
- Adapter implementation guide
- Common use cases
- Troubleshooting section

---

## 12. Code Quality Standards

### 12.1 TypeScript

- Strict mode enabled
- No `any` types (use `unknown` or proper types)
- All public APIs must be typed
- No type assertions without justification comment

### 12.2 Formatting

- Note (blah.chat repo): we use **Biome** for lint/format (not Prettier). Behavior/semantics remain per spec.
- Use Prettier with project config
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line

### 12.3 Naming

- `camelCase` for variables/functions
- `PascalCase` for classes/interfaces
- `SCREAMING_SNAKE_CASE` for constants
- Descriptive names (no abbreviations except common ones)

### 12.4 Comments

- Public methods: JSDoc required
- Private methods: JSDoc optional but encouraged
- Complex logic: inline comments explaining why
- TODOs: Must include ticket/issue reference

---

## 13. Review Checklist

Before marking implementation complete, verify:

### 13.1 Functionality
- [ ] All core methods implemented
- [ ] Decay formula matches spec
- [ ] Spaced repetition works correctly
- [ ] Associative linking works
- [ ] Consolidation groups and compresses
- [ ] Vector search includes all factors (relevance, retention, importance, recency)

### 13.2 Quality
- [ ] All tests pass
- [ ] Test coverage ≥ 80%
- [ ] No TypeScript errors
- [ ] No `any` types
- [ ] All public methods have JSDoc
- [ ] README is complete

### 13.3 Performance
- [ ] Latency requirements met
- [ ] No memory leaks
- [ ] Batch operations use transactions
- [ ] Indexes exist for all queries

### 13.4 Integration
- [ ] Convex schema extended correctly
- [ ] Migration script works
- [ ] Adapter implements all required methods
- [ ] Error handling is comprehensive

### 13.5 Documentation
- [ ] Technical spec matches implementation
- [ ] Examples run without errors
- [ ] API docs are accurate
- [ ] Architecture diagrams exist (if needed)

---

## 14. Open Questions / Future Work

### 14.1 Phase 1 (Current)
- Core SDK implementation
- Convex adapter
- Basic testing

### 14.2 Phase 2 (Next)
- Implement Convex backend mutations/queries
- Wire retrieval into chat message generation
- Add consolidation cron job
- UI for memory visualization

### 14.3 Phase 3 (Future)
- Add more adapters (Postgres, MongoDB)
- LLM-based importance scoring (replace heuristics)
- LLM-based memory summarization
- Advanced consolidation strategies
- Memory export/import
- User controls (view/edit/delete memories)

---

## 15. Success Metrics

### 15.1 Technical
- Code review score: ≥ 4/5
- Test coverage: ≥ 80%
- Zero critical bugs in first month
- Latency targets met (p95)

### 15.2 Product
- Memory retrieval relevance improves (measured by user feedback)
- Important memories stay accessible over time
- Trivial memories fade naturally
- Database size stays manageable (consolidation works)

### 15.3 Business
- First chat app with cognitive memory (competitive advantage)
- SDK adoption: 500+ stars in first month
- Blog post: 10K+ views
- HN front page

---

## Appendix A: Example Scenarios

### Scenario 1: Tampa Trip

**Setup:**
- User mentions Tampa trip planning
- Multiple conversations over 3 weeks
- Confirmed beach day on Thursday

**Query:** "Which day is the beach?"

**Expected Behavior:**
- Memory A: "Beach day Thursday, confirmed with Sarah" (1 day old, importance 0.9, accessed 2x)
  - Relevance: 0.92
  - Retention: 0.97
  - Final: 0.89
- Memory B: "Maybe beach on Thursday?" (21 days old, importance 0.3, accessed 0x)
  - Relevance: 0.91
  - Retention: 0.45
  - Final: 0.41
- **Memory A ranks 2.2x higher despite nearly identical semantic relevance**

### Scenario 2: Consolidation

**Setup:**
- 10 memories about "coffee preferences"
- 7 are fading (retention < 0.2)
- All mention "latte", "dark roast", "no sugar"

**Consolidation Run:**
- Group 7 fading memories by topic ("coffee")
- Summarize: "User prefers dark roast lattes without sugar"
- Store summary (importance: max of originals)
- Mark originals as superseded
- Result: 7 memories → 1 summary

### Scenario 3: Associative Linking

**Setup:**
- User asks about Tampa trip
- AI retrieves: "Beach Thursday" + "Hotel checkout Friday"
- Both used to answer question

**Result:**
- Link created: beach ↔ hotel (strength 0.1)
- Next query about checkout → beach memory surfaces too
- Link strength grows with each co-retrieval (up to 1.0)

---

## Appendix B: Formula Derivations

### Ebbinghaus Forgetting Curve

**Original (1885):**
```
R = e^(-t/S)
```

**Our Adaptation:**
```
R = e^(-t / (S × I × D))
```

**Rationale:**
- `S` (stability): Grows with retrievals (spaced repetition)
- `I` (importance): Boosts decay resistance (2-3x multiplier)
- `D` (base decay): Memory type specific (30/90/∞ days)

**Effect:**
- Important, stable memories persist 10x+ longer
- Trivial, unstable memories fade in days
- Procedural memories never fade

### Spaced Repetition

**SuperMemo SM-2 (simplified):**
```
EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
```

**Our Adaptation:**
```
S' = min(1.0, S + 0.1 × min(2.0, days / 7))
```

**Rationale:**
- Simpler than SM-2 (no quality ratings)
- Spacing bonus encourages longer intervals
- Caps at 1.0 (maximum stability)
- 7-day reference: typical "week" interval in spaced repetition

---

## Appendix C: Convex Backend Functions (To Implement)

These Convex functions need to be implemented in `packages/backend/convex/`:

### Mutations

```typescript
// memories/cognitive.ts

export const createCognitiveMemory = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => { /* ... */ }
});

export const updateCognitiveMemory = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => { /* ... */ }
});

export const strengthenMemories = mutation({
  args: { ids: v.array(v.id("memories")) },
  handler: async (ctx, args) => { /* ... */ }
});

export const batchUpdateRetention = mutation({
  args: { updates: v.array(v.object({ id: v.id("memories"), retention: v.number() })) },
  handler: async (ctx, args) => { /* ... */ }
});
```

### Queries

```typescript
export const getCognitiveMemory = query({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => { /* ... */ }
});

export const findFadingMemories = query({
  args: { userId: v.id("users"), maxRetention: v.number() },
  handler: async (ctx, args) => { /* ... */ }
});

export const findStableMemories = query({
  args: { userId: v.id("users"), minStability: v.number(), minAccessCount: v.number() },
  handler: async (ctx, args) => { /* ... */ }
});
```

### Actions

```typescript
export const cognitiveVectorSearch = action({
  args: { embedding: v.array(v.number()), userId: v.id("users"), limit: v.number() },
  handler: async (ctx, args) => { /* ... */ }
});
```

### Memory Links

```typescript
// memoryLinks.ts

export const createOrStrengthenLink = mutation({
  args: { sourceId: v.id("memories"), targetId: v.id("memories"), strength: v.number() },
  handler: async (ctx, args) => { /* ... */ }
});

export const getLinkedMemories = query({
  args: { memoryId: v.id("memories"), minStrength: v.number() },
  handler: async (ctx, args) => { /* ... */ }
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-10 | Shallan | Initial specification |

---

**This specification is the source of truth for implementation. Any deviation must be documented and justified.**
