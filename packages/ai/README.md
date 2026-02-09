# @blah-chat/ai

Provider-agnostic model registry, gateway helpers, and operational prompts shared across blah.chat apps/services.

## Install

```bash
bun add @blah-chat/ai
```

## Quickstart

```ts
import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { getModel } from "@blah-chat/ai/registry";

const model = getModel(MODEL_CONFIG["openai:gpt-4o"].id);
void model;
```

## API

- `@blah-chat/ai/models`: model definitions + pricing metadata
- `@blah-chat/ai/gateway`: Vercel AI Gateway provider options helpers
- `@blah-chat/ai/registry`: provider registry + `getModel`
- `@blah-chat/ai/operational-models`: operational model constants (embeddings, extraction, etc.)
- `@blah-chat/ai/reasoning`: reasoning config helpers/types
- `@blah-chat/ai/prompts/*`: reusable prompts (triage, extraction)

## Runtime

- ESM only
- Framework-agnostic (but may depend on AI SDK/provider libs)

