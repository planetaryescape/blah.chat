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
- `@blah-chat/ai/operational-models`: operational model constants (embeddings, document extraction, deadlines, etc.)
- `@blah-chat/ai/reasoning`: reasoning config helpers/types
- `@blah-chat/ai/prompts/deadlineParsing`: shared task deadline prompt
- `@blah-chat/ai/prompts/modelTriage` and `@blah-chat/ai/prompts/triage`: reusable triage prompts

The meeting/transcript extraction prompts and their operational-model entries
are retired. Replace deadline imports from the former
`@blah-chat/ai/prompts/taskExtraction` subpath with
`@blah-chat/ai/prompts/deadlineParsing`. Already-published package versions are
unchanged; these exports describe the current source and its next release.

## Runtime

- ESM only
- Framework-agnostic (but may depend on AI SDK/provider libs)
