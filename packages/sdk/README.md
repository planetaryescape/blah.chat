# @blah-chat/sdk

Generated, runtime-friendly SDK for blah.chat HTTP APIs (CLI/Raycast/mobile integrations).

## Install

```bash
bun add @blah-chat/sdk
```

## Quickstart

```ts
import { createBlahClient } from "@blah-chat/sdk";

const client = createBlahClient({ baseUrl: "https://your-host" });
void client;
```

## API

- `@blah-chat/sdk`: client + types
- `@blah-chat/sdk/rpc`: typed RPC helpers

## Runtime

- ESM only

