# @blah-chat/auto-router

Two-stage LLM model router that selects the optimal model for any prompt. Hard rules fire first (deterministic, <1ms), then embedding similarity classifies the rest. Zero runtime dependencies.

## Why this exists

Most model routers either call an LLM to decide which LLM to use (500ms+ latency, extra cost) or require ML training pipelines. This one is **deterministic + fast**: regex-based hard rules catch obvious patterns, then cosine similarity against labeled examples handles everything else. The trade-off: less flexible than a learned router, but cheaper, faster, and fully debuggable.

## How it works

```
User message
    |
    v
+-------------+     match    +--------------+
|  Hard Rules  |------------>|  Route Label  |
|  (regex)     |             +------+-------+
+------+------+                     |
       | no match                   v
       v                   +--------------+
+-------------+            |  Bin Selector |---> Model ID
|  Embedding   |           |  (preferences |
|  Similarity  |---------->|   + sticky)   |
|  (top-K vote)|           +--------------+
+-------------+
```

**10 route labels**: `fast_cheap_chat`, `balanced_general`, `code_heavy`, `long_context`, `strict_json`, `creative_writing`, `research`, `vision`, `reasoning_complex`, `fallback_default`

## Installation

```bash
npm install @blah-chat/auto-router
# or
bun add @blah-chat/auto-router
```

## Quick start

```typescript
import { createRouter, SEED_EXAMPLES } from "@blah-chat/auto-router";

const router = createRouter({
  // Plug in any embedding provider
  embeddingProvider: {
    async embedBatch(texts) {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    },
  },
  // Use built-in 120 labeled examples
  examples: SEED_EXAMPLES,
});

// Full pipeline: classify + select model
const result = await router.route({
  message: "write a Python function to sort a linked list",
});

console.log(result.selectedModelId); // "openai:gpt-5.1-codex"
console.log(result.routeLabel);      // "code_heavy"
```

## Embedding provider

Any function that turns text into vectors works. The interface:

```typescript
interface EmbeddingProvider {
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

### OpenAI

```typescript
const provider: EmbeddingProvider = {
  async embedBatch(texts) {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return res.data.map((d) => d.embedding);
  },
};
```

### Vercel AI SDK

```typescript
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const provider: EmbeddingProvider = {
  async embedBatch(texts) {
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: texts,
    });
    return embeddings;
  },
};
```

### Wrap a single-embed function

```typescript
import { singleToProvider } from "@blah-chat/auto-router";

const provider = singleToProvider(async (text) => {
  const res = await cohere.embed({ texts: [text], model: "embed-v4.0" });
  return res.embeddings[0];
});
```

## Custom models

Override the built-in model configs with your own:

```typescript
const router = createRouter({
  models: {
    "my-org:fast-model": {
      id: "my-org:fast-model",
      name: "Fast Model",
      contextWindow: 128000,
      pricing: { input: 0.1, output: 0.3 },
      capabilities: ["vision", "function-calling"],
    },
    "my-org:smart-model": {
      id: "my-org:smart-model",
      name: "Smart Model",
      contextWindow: 200000,
      pricing: { input: 2.0, output: 8.0 },
      capabilities: ["thinking", "vision", "function-calling"],
    },
  },
  bins: {
    fast_cheap_chat: {
      label: "fast_cheap_chat",
      description: "Quick responses",
      primary: ["my-org:fast-model"],
      fallbacks: ["my-org:smart-model"],
    },
    code_heavy: {
      label: "code_heavy",
      description: "Code tasks",
      primary: ["my-org:smart-model"],
      fallbacks: ["my-org:fast-model"],
    },
    // ... define bins for each route label you want to support
    fallback_default: {
      label: "fallback_default",
      description: "Default fallback",
      primary: ["my-org:fast-model"],
      fallbacks: [],
    },
  },
  fallbackModelId: "my-org:fast-model",
});
```

## Extending examples

Add your own labeled examples alongside (or instead of) the built-in ones:

```typescript
import { SEED_EXAMPLES } from "@blah-chat/auto-router";

const router = createRouter({
  embeddingProvider: myProvider,
  examples: [
    ...SEED_EXAMPLES,
    // Your domain-specific examples
    { text: "analyze this patient's lab results", routeLabel: "reasoning_complex" },
    { text: "generate a Terraform config for EKS", routeLabel: "code_heavy" },
  ],
});
```

Examples are lazily embedded on the first `.classify()` or `.route()` call.

## API reference

### `createRouter(config?): Router`

Creates a configured router instance.

**Config options:**

| Option | Type | Description |
|--------|------|-------------|
| `models` | `Record<string, ModelConfigForRouter>` | Custom model definitions (replaces defaults) |
| `profiles` | `Record<string, ModelProfile>` | Model quality profiles (replaces defaults) |
| `bins` | `Record<string, ModelBin>` | Route label to model mapping (replaces defaults) |
| `examples` | `RoutingExample[]` | Labeled examples for embedding similarity |
| `embeddingProvider` | `EmbeddingProvider` | Required for `classify()` and `route()` |
| `classifierConfig` | `Partial<ClassifierConfig>` | Confidence thresholds, top-K, etc. |
| `defaultPreferences` | `RouterPreferences` | Default cost/speed bias (0-100 each) |
| `fallbackModelId` | `string` | Last-resort model when all bins exhausted |
| `onWarning` | `(msg: string) => void` | Called for validation warnings |

### `Router` interface

```typescript
interface Router {
  route(input: RouteInput): Promise<ClassifierRouterResult>;
  classify(input: ClassifyInput): Promise<ClassifierResult>;
  selectModel(input: SelectModelInput): SelectModelResult;
  readonly registry: ModelRegistry;
}
```

- **`route()`** - Full pipeline: classify + select. Requires `embeddingProvider`.
- **`classify()`** - Hard rules + embedding similarity. Requires `embeddingProvider`.
- **`selectModel()`** - Pick a model from a known route label. No embeddings needed.

## Built-in defaults

- **23 models** across OpenAI, Anthropic, Google, xAI, Perplexity, DeepSeek, Meta
- **120 labeled examples** covering all 10 route labels
- **10 route bins** with primary + fallback model lists
- **6 hard rules**: vision attachments, research keywords, long context, high stakes, JSON output, code fences

## Advanced: individual functions

For composability, all internal functions are exported:

```typescript
import { classify } from "@blah-chat/auto-router/classifier";
import { selectFromBin } from "@blah-chat/auto-router/bin-selector";
import { runHardRules } from "@blah-chat/auto-router/hard-rules";
import { scoreModels, selectWithExploration } from "@blah-chat/auto-router/core";
```

These work with the default built-in model configs, or accept an optional `registry` parameter.

## Development

```bash
bun run build      # Build with tsup
bun run test       # Vitest watch mode
bun run test:run   # Single run
bun run typecheck  # tsc --noEmit
```

## License

MIT
