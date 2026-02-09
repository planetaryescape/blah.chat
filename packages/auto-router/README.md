# @blah-chat/auto-router

Pure TypeScript helpers for routing tasks to “profiles” (model/tool strategies) without coupling to any app framework.

## Install

```bash
bun add @blah-chat/auto-router
```

## Quickstart

```ts
import { buildSystemPrompt } from "@blah-chat/auto-router/prompts";
import { AUTO_ROUTER_PROFILES } from "@blah-chat/auto-router/profiles";

void buildSystemPrompt;
void AUTO_ROUTER_PROFILES;
```

## API

- `@blah-chat/auto-router`: package entrypoint
- `@blah-chat/auto-router/core`: core routing logic
- `@blah-chat/auto-router/profiles`: profile registry
- `@blah-chat/auto-router/prompts`: prompt builders / prompt templates

## Runtime

- ESM only
- Framework-agnostic

