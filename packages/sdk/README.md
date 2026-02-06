# @blah-chat/sdk

Type-safe blah.chat client for HTTP + SSE transports.

## Features

- OpenAPI-based generated types (`src/generated/openapi.ts`)
- Typed HTTP client wrappers (`BlahClient`)
- SSE helpers for `snapshot|update|error|heartbeat` events
- API-key RPC support for CLI/Raycast clients

## Usage

```ts
import { createBlahClient } from "@blah-chat/sdk";

const client = createBlahClient({
  baseUrl: "https://blah.chat",
  getAccessToken: async () => "<jwt>",
});

const conversations = await client.listConversations({ limit: 20 });
```

## What You Can Build

- Custom clients: desktop app, browser extension, TUI, game UI, IoT screen.
- Team copilots: Slack/Discord bots backed by your blah.chat account context.
- Internal tooling: admin dashboards, support consoles, triage views, moderation tools.
- Workflow automations: cron jobs that read threads, summarize, and trigger actions.
- Multi-model routers: build your own orchestration layer on top of blah.chat models.
- Knowledge products: searchable conversation/memory explorers for teams.
- Voice UX: mobile/desktop voice shells that stream updates via SSE.
- Partner integrations: embed chat + memories into third-party SaaS products.

## Typical Integration Patterns

1. User JWT flow: web/mobile apps calling `/api/v1` with bearer auth.
2. API key flow: server-to-server, CLI, Raycast, cron/automation workers.
3. Realtime flow: initial HTTP fetch + SSE stream (`snapshot|update|heartbeat|error`).
4. Hybrid flow: Convex-reactive UI where available, SDK transport for portable clients.

## Versioning

- SemVer: `MAJOR.MINOR.PATCH`
- `MAJOR`: breaking API/interface changes
- `MINOR`: backward-compatible feature additions
- `PATCH`: bug fixes and non-breaking updates

## Release Workflow

1. Update `openapi/openapi.json`
2. Run `bun --filter=@blah-chat/sdk run generate`
3. Run `bun --filter=@blah-chat/sdk run build`
4. Update `CHANGELOG.md`
5. Publish dry-run with `bun publish --dry-run` from `packages/sdk`

## Deprecation Policy

- Deprecated APIs are announced in changelog before removal.
- Minimum deprecation window: one MINOR release.
- Removed APIs only in next MAJOR release.
