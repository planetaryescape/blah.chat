---
name: resilient-generation-flow
description: Trace or debug blah.chat generation, stuck requests, SSE reconnects, checkpoints and recovery. Project-specific Postgres and Trigger.dev workflow.
license: MIT
---

# Resilient generation in blah.chat

Generation must survive refresh and tab closure. Observe a failing request and
its persisted state before changing code. Record request ID, session ID, status,
worker logs and the client reconnect behavior.

## Trace the current implementation

Start with these repository-relative paths:

- `apps/web/src/app/api/v1/generations/route.ts`: authenticated request creation
  and enqueueing.
- `packages/jobs/src/trigger/process-generation.ts`: background processing.
- `apps/web/src/lib/generation-v2/runtime.ts`: service and queue wiring.
- `apps/web/src/lib/generation-v2/service.ts`: provider streaming, checkpoints,
  terminal status and stalled-generation handling.
- `apps/web/src/lib/generation-v2/repository.ts` and `store.ts`: persisted state
  and event storage; schema in `packages/persistence-postgres/src/schema.ts`.
- `apps/web/src/app/api/v1/generations/[requestId]/stream/route.ts`: authenticated
  SSE attachment and disconnect cleanup.
- `packages/jobs/src/trigger/recover-stuck-generations.ts`: recovery.

Follow the concrete request through these layers. A disconnected SSE subscriber
must not become the owner of background generation. Preserve idempotency,
terminal-state guards, authenticated ownership and token/cost accounting.

## Verify

Choose the relevant existing tests under
`apps/web/src/lib/generation-v2/__tests__/` and the route/job tests beside the
changed layer. Use the repository's Bun scripts. For reconnect bugs, reproduce a
refresh while generation is active and verify persisted final content, one
logical request, and successful reattachment. A passing unit test alone does not
prove reconnect behavior.

## Provenance

Paths and architecture checked against `origin/fix/smooth-stream-rendering`,
`ca1bcd61626efd14492da1bf80de7b210f940026` on 2026-09-08. Fetch the task's target
branch and inspect current code before relying on this map.
[Historical Convex workflow](references/legacy-convex.md) preserves the former
global skill for old branches only.
