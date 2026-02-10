# @blah-chat/cognitive-memory

Human-like memory for AI agents with **Ebbinghaus decay curves**, **spaced repetition**, and **associative linking**.

## Why This Exists

Most AI memory is either:
1. **Stateless** (forgets everything)
2. **Append-only** (remembers everything equally, forever)
3. **Simple RAG** (vector search with no cognitive model)

None of these reflect how human memory actually works. We built a system that does.

## Features

- **🧠 Ebbinghaus Forgetting Curve**: Memories decay exponentially over time
- **💪 Retrieval Strengthening**: Accessing memories makes them stronger (spaced repetition)
- **🔗 Associative Linking**: Related memories surface together
- **📊 Memory Types**: Episodic (events), Semantic (facts), Procedural (skills) with different decay rates
- **♻️ Automatic Consolidation**: Compress fading memories, clean up stale data
- **🔌 Adapter Pattern**: Bring your own database (Convex, Postgres, etc.)

## Installation

```bash
bun add @blah-chat/cognitive-memory
```

## Quick Start

```typescript
import { CognitiveMemory, ConvexAdapter } from "@blah-chat/cognitive-memory";
// Provide your Convex function references (from your project's convex/_generated/api).
// Example (this repo): import { api } from "@blah-chat/backend/convex/_generated/api";
const functions = {
  // memories/cognitive.ts
  createCognitiveMemory: api.memories.cognitive.createCognitiveMemory,
  updateCognitiveMemory: api.memories.cognitive.updateCognitiveMemory,
  deleteCognitiveMemory: api.memories.cognitive.deleteCognitiveMemory,
  deleteCognitiveMemories: api.memories.cognitive.deleteCognitiveMemories,
  getCognitiveMemory: api.memories.cognitive.getCognitiveMemory,
  getCognitiveMemories: api.memories.cognitive.getCognitiveMemories,
  queryCognitiveMemories: api.memories.cognitive.queryCognitiveMemories,
  findFadingMemories: api.memories.cognitive.findFadingMemories,
  findStableMemories: api.memories.cognitive.findStableMemories,
  markSuperseded: api.memories.cognitive.markSuperseded,
  batchUpdateRetention: api.memories.cognitive.batchUpdateRetention,
  cognitiveVectorSearch: api.memories.cognitive.cognitiveVectorSearch,

  // memoryLinks.ts
  createOrStrengthenLink: api.memoryLinks.createOrStrengthenLink,
  getLinkedMemories: api.memoryLinks.getLinkedMemories,
  getLinkedMemoriesMultiple: api.memoryLinks.getLinkedMemoriesMultiple,
  deleteLink: api.memoryLinks.deleteLink,
};

const memory = new CognitiveMemory({
  adapter: new ConvexAdapter({ client: convexClient, functions }),
  embeddingProvider: {
    embed: async (text) => {
      // Your embedding logic (OpenAI, Cohere, etc.)
      return await openai.embeddings.create({ input: text });
    }
  },
  userId: 'user-123'
});

// Store memory
await memory.store({
  content: "User prefers dark mode and hates bright colors",
  memoryType: 'semantic',  // 'episodic' | 'semantic' | 'procedural'
  importance: 0.7          // 0.0-1.0
});

// Retrieve with decay weighting
const results = await memory.retrieve({
  query: "What are the user's UI preferences?",
  limit: 5,
  includeAssociations: true  // Surface related memories
});

// Results are scored by relevance × retention
for (const memory of results) {
  console.log(memory.content, {
    relevance: memory.relevanceScore,
    retention: memory.retention,
    finalScore: memory.finalScore
  });
}

// Run consolidation (daily cron job)
const consolidation = await memory.consolidate();
console.log(`Compressed ${consolidation.compressed.length} memory groups`);
```

## How It Works

### Decay Formula

Memories decay exponentially based on time, stability, and importance:

```typescript
retention = e^(-t / (S × importance_boost × base_decay))
```

Where:
- `t` = days since last access
- `S` = stability (0.0-1.0, grows with retrievals)
- `importance_boost` = 1 + (importance × 2)
- `base_decay` = memory type specific (30/90/∞ days)

**Example:**
- Fresh episodic memory (stability 0.3, importance 0.5): 50% after ~9 days
- Reinforced semantic memory (stability 0.8, importance 0.9): 50% after ~67 days

### Retrieval Strengthening

Every access increases stability (spaced repetition):

```typescript
new_stability = min(1.0, old_stability + 0.1 × spacing_bonus)
spacing_bonus = min(2.0, days_since_last_access / 7)
```

Longer gaps between retrievals = bigger stability boost.

### Associative Linking

Memories retrieved together automatically link:

```typescript
// When memories A, B, C are retrieved together
link(A, B, strength: 0.1)  // or strengthen if exists
link(A, C, strength: 0.1)
link(B, C, strength: 0.1)
```

Future retrievals include linked memories with strength > 0.3.

### Consolidation

Background process (run daily):

1. **Find fading memories** (retention < 0.2)
2. **Group similar memories** by topic/embedding
3. **Compress 5+ similar memories** into one summary
4. **Promote stable memories** (stability > 0.9, accessed 10+ times)
5. **Delete very stale memories** (retention < 0.05 for 30+ days)

## Memory Types

| Type | Use For | Base Decay | Example |
|------|---------|------------|---------|
| `episodic` | Events with time/place | 30 days | "Yesterday I had coffee with Sarah" |
| `semantic` | Facts, preferences | 90 days | "Paris is the capital of France" |
| `procedural` | Skills, how-to | Never* | "How to ride a bicycle" |

*Procedural memories are updated by correction, not decay.

## API Reference

### `CognitiveMemory`

Main class for memory management.

#### Constructor

```typescript
new CognitiveMemory({
  adapter: MemoryAdapter;
  embeddingProvider: EmbeddingProvider;
  userId: string;
  config?: {
    defaultImportance?: number;      // default: 0.5
    defaultStability?: number;        // default: 0.3
    minRetention?: number;            // default: 0.2
    decayRates?: {
      episodic?: number;              // default: 30
      semantic?: number;              // default: 90
      procedural?: number;            // default: Infinity
    };
  };
})
```

#### Methods

**`store(input: MemoryInput): Promise<string>`**

Store a new memory. Returns memory ID.

```typescript
await memory.store({
  content: string;
  memoryType?: 'episodic' | 'semantic' | 'procedural';
  importance?: number;  // 0.0-1.0, auto-scored if omitted
  stability?: number;   // initial stability, default 0.3
  metadata?: Record<string, any>;
});
```

**`retrieve(query: RetrievalQuery): Promise<ScoredMemory[]>`**

Retrieve relevant memories, sorted by `relevance × retention`.

```typescript
await memory.retrieve({
  query: string;
  limit?: number;                      // default: 5
  minRetention?: number;               // default: from config
  memoryTypes?: MemoryType[];          // filter by type
  includeAssociations?: boolean;       // default: true
});
```

**`get(id: string): Promise<Memory | null>`**

Get a single memory by ID. Triggers retrieval strengthening.

**`update(id: string, content: string): Promise<void>`**

Update memory content (regenerates embedding).

**`delete(id: string): Promise<void>`**

Delete a memory.

**`consolidate(): Promise<ConsolidationResult>`**

Run consolidation process (compression, cleanup, promotion).

**`link(sourceId: string, targetId: string, strength?: number): Promise<void>`**

Manually create or strengthen a link between memories.

### Adapters

Implement `MemoryAdapter` interface for your database:

```typescript
import { BaseMemoryAdapter } from '@blah-chat/cognitive-memory';

class MyAdapter extends BaseMemoryAdapter {
  async createMemory(memory) { /* ... */ }
  async getMemory(id) { /* ... */ }
  async vectorSearch(embedding, filters) { /* ... */ }
  // ... implement other methods
}
```

See `src/adapters/base.ts` for full interface.

## Utilities

### Decay Calculations

```typescript
import {
  calculateRetention,
  updateStability
} from "@blah-chat/cognitive-memory";

// Calculate current retention
const retention = calculateRetention({
  stability: 0.5,
  importance: 0.7,
  lastAccessed: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
  memoryType: 'semantic'
});

// Calculate new stability after retrieval
const newStability = updateStability(currentStability, daysSinceAccess);
```

### Scoring

```typescript
import {
  scoreImportance,
  categorizeMemoryType,
  extractTopics
} from '@blah-chat/cognitive-memory';

// Heuristic importance scoring (0.0-1.0)
const importance = scoreImportance("I decided to buy a house");

// Categorize memory type
const type = categorizeMemoryType("Yesterday I went to the store");

// Extract topics/keywords
const topics = extractTopics("Machine learning and AI are transforming...");
```

### Embeddings

```typescript
import {
  cosineSimilarity,
  euclideanDistance,
  normalizeVector
} from "@blah-chat/cognitive-memory";

// Similarity between vectors
const similarity = cosineSimilarity(vectorA, vectorB);

// Distance between vectors
const distance = euclideanDistance(vectorA, vectorB);

// Normalize vector to unit length
const normalized = normalizeVector(vector);
```

## Examples

### With OpenAI Embeddings

```typescript
import { CognitiveMemory } from "@blah-chat/cognitive-memory";
import OpenAI from "openai";

const openai = new OpenAI();

const memory = new CognitiveMemory({
  adapter: myAdapter,
  embeddingProvider: {
    embed: async (text) => {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      return response.data[0].embedding;
    }
  },
  userId: "user-123"
});
```

### Daily Consolidation Cron

```typescript
// Run daily at 2am
import { CognitiveMemory } from '@blah-chat/cognitive-memory';

async function runConsolidation() {
  const userIds = await getAllUserIds();
  
  for (const userId of userIds) {
    const memory = new CognitiveMemory({
      adapter: myAdapter,
      embeddingProvider: myProvider,
      userId
    });
    
    const result = await memory.consolidate();
    
    console.log(`User ${userId}:`, {
      decayed: result.decayed.length,
      compressed: result.compressed.length,
      deleted: result.deleted
    });
  }
}
```

## Prior Art & References

- **Stanford Generative Agents** (Park et al., 2023): Memory streams with importance scoring
- **Ebbinghaus Forgetting Curve** (1885): Exponential memory decay over time
- **Spaced Repetition**: SuperMemo, Anki algorithms for optimal review scheduling

Our contribution:
- Explicit Ebbinghaus decay curves (vs. simple recency)
- Retrieval strengthening mechanics (spaced repetition for AI)
- Associative memory graph with link strengthening
- Production-ready implementation for chat apps

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Type check
pnpm typecheck

# Test
pnpm test
```

## License

MIT © Bhekani Khumalo

## Contributing

PRs welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md).

For bugs or feature requests, please [open an issue](https://github.com/planetaryescape/blah.chat/issues).

---

**Related:**
- [blah.chat](https://blah.chat) - First chat app with cognitive memory
- [Blog post](https://bhekani.com/posts/cognitive-memory-for-ai-agents) - Deep dive into the architecture
- [Research repo](https://github.com/bhekanik/cognitive-memory-skill) - Original Python implementation
