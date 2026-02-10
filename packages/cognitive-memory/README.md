# @blah-chat/cognitive-memory

Human-like memory for AI systems: remember what matters, forget what does not, and surface useful associations.

Pure TypeScript core. No runtime deps required. Optional Convex adapter.

## What It Is

A small memory SDK built around 3 behaviors:

1. Forgetting: memories decay over time (Ebbinghaus curve).
2. Retrieval strengthening: using a memory makes it more stable (spaced repetition).
3. Association: memories retrieved together become linked, so they can co-surface later.

It is not “vector search with a database” and it is not “store everything forever”.

## Why It Exists (Trade-Offs)

Most memory systems pick one extreme:

1. Stateless: no persistence, no long-term recall.
2. Append-only: everything stays equally important forever.
3. Simple RAG: semantic similarity only, no decay, no strengthening, no associative linking.

This SDK makes a different choice: add a lightweight cognitive model so recency, importance, and access patterns matter as much as similarity.

## Mental Model

Each `Memory` is `content` + `embedding` + cognitive fields.

| Field | Range | Meaning | Used for |
|---|---:|---|---|
| `importance` | 0..1 | significance | slows forgetting |
| `stability` | 0..1 | “how learned” | grows on retrieval; slows forgetting |
| `lastAccessed` | ms | last retrieval time | drives decay |
| `accessCount` | int | usage count | consolidation heuristics |
| `retention` | 0..1 | cached decay score | downranks stale memories |

Retrieval score is `relevance * retention`. “Relevant but stale” gets pushed down.

## Core Concepts

### Memory Types

| `memoryType` | Meaning | Base decay | Examples |
|---|---|---:|---|
| `episodic` | events w time/place context | 30 days | “Yesterday I met Sarah” |
| `semantic` | facts/preferences | 90 days | “User prefers dark mode” |
| `procedural` | skills/how-to | Infinity | “How to format code” |

Procedural memories do not decay (retention is always 1.0).

### Retention (Forgetting Curve)

Retention is exponential decay:

```ts
retention = exp(-t / (S * I * D))
```

Where:

- `t` = days since last access (clamped at 0)
- `S` = stability (0..1)
- `I` = importance boost = `1 + (importance * 2)` (range 1..3)
- `D` = base decay in days (by memory type)

Edge case:

- if `S * I * D < 0.1`, the implementation falls back to a simple linear drop to avoid divide-by-near-zero.

### Stability Update (Spaced Repetition)

Each retrieval strengthens stability based on spacing:

```ts
spacingBonus = min(2.0, daysSinceLastAccess / 7)
newStability = min(1.0, oldStability + 0.1 * spacingBonus)
```

Longer gaps produce larger strengthening, capped.

### Retrieval Scoring

Base scoring:

```ts
finalScore = cosineSimilarity(queryEmbedding, memoryEmbedding) * retention
```

Associations add an alternate relevance channel:

```ts
relevance = max(cosineSimilarity(query, memory), linkStrength)
final = relevance * retention
```

This allows strongly-linked memories to co-surface while still being penalized if they have decayed.

## What The SDK Does (Lifecycle)

### store()

`store({ content, ... })`:

1. Embeds `content`.
2. Applies defaults if omitted:
   - `memoryType`: `"semantic"`
   - `importance`: `config.defaultImportance` (default 0.5)
   - `stability`: `config.defaultStability` (default 0.3)
   - `accessCount`: 0
   - `lastAccessed`: now
   - `retention`: 1.0
3. Persists via adapter.

### retrieve()

`retrieve({ query, ... })`:

1. Embeds the query.
2. Vector-searches candidates (overfetches by `limit * 3`).
3. Recomputes retention for candidates.
4. Scores `relevance * retention`, filters by `minRetention`, sorts.
5. If `includeAssociations`:
   - fetches linked memories (min strength 0.3)
   - scores them using `max(cosine, linkStrength) * retention`
   - merges + dedupes + re-sorts
6. Strengthens all returned memories:
   - updates `stability`, increments `accessCount`, sets `lastAccessed`, recomputes `retention`
7. Strengthens links between co-retrieved memories:
   - all pairs get `+0.1` strength (capped at 1.0)

### get()

`get(id)` loads a single memory and strengthens it if found.

### update()

`update(id, content)` regenerates embedding and updates content.

### link()

`link(sourceId, targetId, strength?)` creates or strengthens a link (strength in 0..1).

### consolidate()

`consolidate()` is a background cleanup/compression pass:

1. Finds fading memories (retention < 0.2).
2. Groups by topics (simple heuristic).
3. For groups of 5+, stores a summary memory and marks originals superseded.
4. Returns promotion candidates (stable + frequently used).
5. Deletes very stale memories (retention < 0.05 for 30+ days).

v1 uses a heuristic summary (concat + truncate), not an LLM.

## Installation

```bash
bun add @blah-chat/cognitive-memory
```

## Quick Start (SDK Only)

You provide:

- an `embeddingProvider` (`embed(text) -> number[]`)
- an adapter (Convex adapter exists; you can implement your own)

```ts
import { CognitiveMemory } from "@blah-chat/cognitive-memory";

const memory = new CognitiveMemory({
  adapter: myAdapter,
  embeddingProvider: { embed: async (text) => myEmbeddings(text) },
  userId: "user-123",
});

await memory.store({ content: "User prefers dark mode", importance: 0.7 });

const results = await memory.retrieve({ query: "UI preferences", limit: 5 });
for (const m of results) console.log(m.content, m.finalScore);
```

## Embedding Provider Guide

### Contract

Your `embed()` must:

- return a numeric vector
- return the same vector length for every call
- use the same embedding model for both stored memories and queries

The SDK validates vector lengths when computing similarity.

### Example: OpenAI embeddings (optional)

Example only. The SDK does not bundle this client.

```ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const embeddingProvider = {
  embed: async (text: string) => {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return r.data[0].embedding;
  },
};
```

## Convex Integration

This package ships `ConvexAdapter`, but you must also implement matching Convex backend functions and schema.

If you are in the `blah.chat` monorepo, the reference implementation is:

- `packages/backend/convex/memories/cognitive.ts`
- `packages/backend/convex/memoryLinks.ts`
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/migrations/add_cognitive_memory_fields.ts`

### Deploy Schema + Functions

From `packages/backend`:

```bash
bun --filter=@blah-chat/backend run deploy
```

Non-interactive Convex CLI:

```bash
./node_modules/.bin/convex deploy -y
```

### Backfill Existing Memories (One-Time)

Safe to re-run. Skips rows that already have `memoryType`.

```bash
./node_modules/.bin/convex run --prod migrations/add_cognitive_memory_fields:migrate '{}'
```

Optional retention recompute:

```bash
./node_modules/.bin/convex run --prod migrations/add_cognitive_memory_fields:backfillRetentionScores '{}'
```

### Wire The Adapter

You pass function references explicitly:

```ts
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { CognitiveMemory, ConvexAdapter } from "@blah-chat/cognitive-memory";

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const functions = {
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
  createOrStrengthenLink: api.memoryLinks.createOrStrengthenLink,
  getLinkedMemories: api.memoryLinks.getLinkedMemories,
  getLinkedMemoriesMultiple: api.memoryLinks.getLinkedMemoriesMultiple,
  deleteLink: api.memoryLinks.deleteLink,
};

const memory = new CognitiveMemory({
  adapter: new ConvexAdapter({ client, functions }),
  embeddingProvider: { embed: async (text) => myEmbeddings(text) },
  userId: "user-123",
});
```

### Convex Notes

Importance scale mapping:

- SDK: `importance` is 0..1
- Convex: `metadata.importance` is 1..10
- Adapter maps both directions

Ownership/auth:

- Convex backend enforces ownership on reads/writes.
- Your SDK `userId` must match the owner id used by your Convex schema.

## Public API (Exports)

```ts
import {
  CognitiveMemory,
  ConvexAdapter,
  BASE_DECAY_RATES,
  calculateRetention,
  updateStability,
  cosineSimilarity,
  euclideanDistance,
  normalizeVector,
  scoreImportance,
  categorizeMemoryType,
  extractTopics,
} from "@blah-chat/cognitive-memory";
```

### CognitiveMemory

Public methods:

- `store(input): Promise<string>`
- `retrieve(query): Promise<ScoredMemory[]>`
- `get(id): Promise<Memory | null>`
- `update(id, content): Promise<void>`
- `consolidate(): Promise<ConsolidationResult>`
- `link(sourceId, targetId, strength?): Promise<void>`

Behavior notes:

- Public methods validate ranges and throw on invalid input.
- Embedding calls retry up to 3 attempts with exponential backoff.
- Timestamps are milliseconds since epoch.

## Troubleshooting

### “No results” or results feel stale

Checklist:

- Embedding vectors are consistent length.
- `minRetention` is not too high (default 0.2).
- Your stored memories have `lastAccessed` and `stability` in valid ranges.

### Convex vector search “works” but `relevanceScore` looks wrong

Checklist:

- Your backend action returns the `_score` from `ctx.vectorSearch` as `relevanceScore`.
- Your vector index name matches what your backend uses (reference uses `by_embedding`).

### Importance feels ignored

Likely:

- You never set `importance` and the heuristic scorer does not match your domain.

Fixes:

- set `importance` explicitly on `store()`
- replace the heuristic with your own policy or an LLM-based scorer

### Procedural memories never disappear

By design:

- procedural retention is always 1.0

If you want them to fade:

- store as `semantic`, or periodically delete superseded procedural memories in your app layer

## Development

```bash
bun install
bun --filter=@blah-chat/cognitive-memory run build
bun --filter=@blah-chat/cognitive-memory run typecheck
bun --filter=@blah-chat/cognitive-memory run test:run
```

## License

MIT

