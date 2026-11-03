# 01: Architecture

## Preserve the system of record

Keep Convex-owned generation and the four existing client surfaces. Add narrow authorization, lifecycle and execution boundaries around them. Everything labeled proposed here is a recommendation under D-014–D-035, not an installed service or approved framework migration. Source baseline: `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03 (D-001, D-002).

### Current ownership

```text
┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Web / Next.js    │ │ CLI / Bun        │ │ Mobile / Expo  │ │ Desktop/Tauri  │
│ Convex observer  │ │ authenticated RPC│ │ existing data  │ │ existing app   │
│ Dexie projection│ │ client           │ │ adapters       │ │ shell          │
└────────┬─────────┘ └────────┬─────────┘ └───────┬────────┘ └───────┬────────┘
         │                   │                   │                  │
         ├── Convex subscriptions/queries ───────┴──────────────────┤
         └── Next HTTP: REST / CLI RPC / polling SSE ────────────────┘
                                   │ authenticated forwarding
┌──────────────────────────────────▼────────────────────────────────────┐
│ Convex                                                               │
│ Public queries/mutations/actions + HTTP + cron entrypoints             │
│ chat admission → scheduled generation action → partial/final mutations│
│ Scheduler starts actions; not a journal of every model/tool step       │
├──────────────────────────────────────────────────────────────────────┤
│ Store: conversations/messages DAG, normalized toolCalls/sources,       │
│ files, canvas, Composio selections, usageRecords, tasks/notes/memory    │
└──────────────────────────────────┬────────────────────────────────────┘
                                   │ server SDK calls
                   ┌───────────────┼───────────────────┐
                   ▼               ▼                   ▼
             Model providers  E2B code executor   Composio broker
             /AI Gateway      (already present)  (per-chat selected)
```

The diagram is an ownership map, not a claim that every client uses every transport. Preserve each client's existing adapter while proving its actual deployed path in S15. Normal chat schedules Convex work and persists partials. Next's SSE route polls message snapshots every three seconds; it does not own generation or currently supply replayable run-event cursors. Composio tools come from selected active per-chat connections, not every active account. See [generation](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/convex/generation.ts#L794-L1033), [SSE route](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/app/api/v1/messages/stream/%5BconversationId%5D/route.ts#L56-L108), [connection selection](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/convex/generation.ts#L399-L427).

### Proposed ownership

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Web             CLI             Mobile             Desktop           │
│ Same saved messages, run/wait projections, output IDs and receipts    │
│ No provider credentials, dispatch authority or background-run owner   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ Convex / versioned REST + SSE / RPC
┌─────────────────────────────────▼───────────────────────────────────┐
│ Public boundary: identity → parent ACL → validated request → limits  │
│ One admission path: request dedupe + route/payer + reservation        │
├─────────────────────────────────────────────────────────────────────┤
│ Convex store + transactional state/lease/settlement mutations         │
│ messages/DAG  agentRuns/runAttempts  toolCalls  interactions           │
│ checkpoints  artifacts/revisions  usageEvents → derived aggregates   │
│ Optional gated domains: skills, connections, schedules, computers    │
├─────────────────────────────────────────────────────────────────────┤
│ Scheduler/actions: bounded steps, explicit owner/context, fenced writes│
│ One engine/version per run; optional Workflow after S8, not selected  │
│ Human wait → persisted interaction → one accepted answer → resume    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ executor policy + exact operation ID
┌─────────────────────────────────▼───────────────────────────────────┐
│ Server-only gateways                                                 │
│ Provider: request-scoped credentials/catalog/cache/usage normalization│
│ E2B: clean allocation/ingress/leases/actions/private export/compute    │
│ Broker: exact selected account/scopes/revision/revoke reconciliation   │
└──────────────┬────────────────────┬────────────────────┬──────────────┘
               ▼                    ▼                    ▼
        Providers/AI Gateway       E2B           Composio or gated challenger
               └──── execution receipts and immutable usage ────┘
```

`usageEvents` is financial evidence, not sampled telemetry. Append-only settlement/correction events feed `usageRecords` projections; trace-export failure must not change a successful answer. `runEvents` reports bounded activity, not an extra transcript or a substitute for authoritative state (D-016, D-034). [02](02-data-model.md) defines the records; [14](14-cost-model.md) defines their accounting semantics.

## Why this shape

1. Preserve the existing refresh contract. Moving the producer into a page, hook or HTTP response would lose work when that observer disconnects (D-002).
2. Repair public entrypoints directly. REST middleware cannot secure an independently callable Convex action. Thin public wrappers must call internal primitives after identity/ACL/admission checks (D-014).
3. Separate transport, state, execution and effects. Subscriptions reconnect; durable rows restore UI; bounded checkpoints restore execution; effect identities and reconciliation address remote uncertainty. None implies the others (D-017, D-021).
4. Keep changes small enough to release. ACL/TTS/native-result repairs do not require Workflow, all optional tables or AI SDK7. Test a compatible SDK6 cohort first; compare Workflow only for a measured continuation need (D-015, D-020, D-021, D-030).
5. Reuse shared owners. Computers, schedules and skills reuse runs, interactions, artifacts and usage. A second approval database would create inconsistent authority and deletion rules (D-024–D-029).

We do not recommend a wholesale Agent/Eve/framework/database rewrite, a Redis/BullMQ transplant from Notto, or a browser-owned stream. These are proposals excluded from this plan, not fabricated prior BK rejections. Q19/S8 decide the continuation engine; [19](19-reuse-map.md) limits Notto reuse (D-011, D-021).

## Responsibilities and lifecycle

| Boundary | Owns | Must not own | Verification |
|---|---|---|---|
| Client | Unsent draft, optimistic request identity, reading/focus state, saved projections | Provider execution, permission grants inferred from UI, age-based terminal state | Refresh/unmount/two-tab/old-client fixtures; S8/S15 |
| Next routes/DAL | HTTP auth forwarding, envelope/codec, bounded transport, private/no-store response | Independent generation, trusted caller `userId`, alternate cascade | Route→real Convex validator and direct-endpoint ACL tests; S2/S3 |
| Convex mutations/queries | Parent ACL, atomic admission/CAS, append history, projections, lease fences | External network effects in a transaction, trust in supplied owner IDs | Conflict/race/duplicate/stale-owner tests; S2/S3 |
| Convex actions/scheduler | Explicit initiating owner, exact request planning, bounded model/tool steps, receipts | Ambient scheduled identity, retry of an entire effecting loop, unsupervised authority | Uncached background instructions, crash/resume/stop tests; S3/S8/S13 |
| Provider gateway | Per-request credentials, resolved model/API/host/payer, native provider conversion and actual usage | Global client credential mutation, silent BYOK platform fallback | Concurrent two-user mock keys and all-step settlement; S3/S18 |
| Tool/E2B/broker gateway | Recheck current policy, exact effect/account binding, limits, result bounds and uncertainty | Treat model text, skill instructions or connection presence as authorization | Forged account, revoked-after-build, lost-ack and cancellation tests; S10–S12 |
| Cleanup worker | Reference-safe deletion, local erasure signal, retryable remote cleanup | Recreating deleted parents, pretending broker deletion revokes every upstream grant | Late-worker/delete/restore tests; S17 |

After an await, Run-owned agent writes must prove their current Run/Attempt lease, cancellation/terminal fences and undeleted owner/resource parents. Standalone asynchronous writes use their admitted operation/operation-Attempt fences and only real referenced parents; human artifact saves check current authenticated artifact/parent edit rights before the shared revision CAS, without a chat Run or agent lease ([02](02-data-model.md)). Late financial/effect evidence uses its separately authorized idempotent ingestion path, never recreating deleted content or requiring a live chat. Terminal run states are monotonic. Progress, cancellation request and effect uncertainty are separate fields; do not turn each into a new Run status. Waiting releases execution resources but retains durable state and an independently bounded expiry/resume path. [04](04-durable-generation.md) owns the precise state machine (D-017, D-025).

## Package and import boundaries

Keep current workspace names. Some package entrypoints are empty placeholders, including [`api-envelope`](../../packages/api-envelope/src/index.ts), [`streaming-core`](../../packages/streaming-core/src/index.ts) and [`persistence-convex`](../../packages/persistence-convex/src/index.ts). Do not describe those as implemented shared runtimes or fill them merely to complete an architecture diagram. Extract a tested seam when the release needs it (D-002, D-030).

| Path / package | Current role and proposed boundary |
|---|---|
| `apps/web` | Web UI and HTTP adapters. Imports public shared contracts and generated backend references; never server credential/gateway implementations into a client bundle. |
| `apps/cli`, `apps/mobile`, `apps/desktop` | Existing clients and platform packaging. Import compatible public projections/codecs, not web `@/` components or backend Node executors. |
| `packages/backend/convex` | Authority, persistence, server actions, tools, scheduled work and cleanup. Node-only gateway code stays out of query/mutation/browser dependency graphs. |
| `packages/ai` | Central model definitions, operational configuration, prompt modules and provider adapters. Proposed executable catalog snapshot is consumed by picker/admission/router/pricing; it does not import app UI. |
| `packages/auto-router` | Routing algorithms/eligibility logic. No independent model authority, direct private-chat export or credential policy; consumes the resolved catalog/policy contract. |
| `packages/api-client`, `packages/sdk` | Existing cross-client HTTP/RPC consumer contracts. Move endpoint/OpenAPI/SDK fixtures together when wire shapes change. |
| `packages/shared`, `chat-ui-core` | Platform-neutral types/pure UI state where already implemented. No database or secrets in reusable view models. |
| `packages/code-execution-core`, `integrations-composio`, `assistant-tools-core` | Reuse actual implementations where present; server-only side-effecting adapters remain behind executor policy. Package names do not bypass that policy. |
| `packages/byod-schema` and backend schema modules | Generated deployment contract and modular definitions. Update through their generator and version migration, not manual generated-file edits. |
| Other domain packages | Preserve existing exports and dependencies. Do not force unrelated domain extraction during an endpoint repair. |

Proposed enforcement: a tracked-source import-graph check must reject app-to-app imports, reusable-package→app imports, client→credential/Node-executor imports and new implementation deep imports outside declared exports. Allow the existing generated Convex API/data-model subpaths explicitly. A seeded forbidden import must fail the check. Existing intentional generated BYOD schema imports are a named generator-only exception. Runtime bundling/typechecks still prove Node/browser separation; static naming alone does not (D-020, D-033).

## Transport, envelopes and codecs

### Existing contracts to preserve

- Convex uses generated function references, `v` validators and its native value codec. Browser subscriptions observe authorized saved rows. Do not pass raw Convex documents as a new public HTTP schema by default.
- HTTP JSON is UTF-8 JSON. Responses use `formatEntity`, `formatEntityList` or `formatErrorEntity` from [`apps/web/src/lib/utils/formatEntity.ts:12–98`](../../apps/web/src/lib/utils/formatEntity.ts#L12). Root AGENTS.md's old path is preserved but not the current file location (D-002).
- The success envelope is `{status:"success",sys:{entity,id?,timestamps?},data}`. List data contains `{sys:{entity,id?},data}` items. Errors are `{status:"error",sys:{entity:"error"},error}`; `error` may be text or a typed message/code/details object. HTTP status must still express failure.
- Messages REST list currently uses an array of per-item envelopes and its SDK expects that shape. Do not double-wrap it as a lone cleanup. Change endpoint, OpenAPI, SDK and compatibility fixtures together ([DAL](../../apps/web/src/lib/api/dal/messages.ts#L130), [SDK](../../packages/api-client/src/client.ts#L196); D-031).
- Existing SSE is `event: <name>\ndata: <JSON>\n\n` with snapshot/update/heartbeat/error, not provider token streaming. Its bounded slow-client behavior closes the stream for a fresh snapshot ([codec](../../apps/web/src/lib/api/sse/utils.ts#L29)). Disconnect only releases observation resources.

Compaction in `formatEntity` removes empty/null/undefined values. Required semantic fields such as empty message content, explicit false/zero values, cleared waits and empty tool outputs need round-trip fixtures; preserve fields or use a discriminated DTO where omission would change meaning. Do not cite the source comment's percentage reduction as a measured gain (D-015, D-033).

### Proposed versioned additions

1. Define shared request/response validators for each new operation before wiring clients. HTTP DTOs use string IDs validated against their resource kind; storage uses branded Convex IDs. Instants in new domain data are epoch milliseconds; existing `sys.timestamps` remain ISO-8601 strings. Bytes use authenticated content references, not raw binary in JSON.
2. Keep native JSON tool args/results through storage and UI. Provider-specific typed tool messages and untrusted-data framing belong at the provider conversion boundary. Cap nesting/bytes and use private blob references for large results (D-015).
3. New Run/event endpoints carry `protocolVersion: 1` inside their domain data, with run/event identity and per-run `sequence`. Cursor replay is a new adapter, not a claim about today's SSE. If a cursor has expired, return a fresh authorized snapshot and its high-water sequence; never redispatch work to reconstruct the view.
4. Additive optional fields and unknown non-authorizing event types may be ignored by old readers. Unknown authority-bearing kinds, tool schema versions, interaction versions or policy versions fail closed. An unsupported status renders a safe unavailable/upgrade state, never success or approval. Do not store an unknown enum merely to make a client happy.
5. Commands carry stable request/operation identity and expected version; mismatched payload hash or stale revision returns a conflict. Retrying transport returns the accepted receipt, not another effect. `messages.runProjection` is the additive wait contract in [02](02-data-model.md#message-projection-and-old-readers).
6. Pin a supported client cohort before enabling waits/new authority on shared conversations. Old `generating` recovery paths must not cancel a parked run. Keep older read endpoints while new clients migrate; require upgrade or provide a non-authorizing fallback rather than hiding a question in activity (D-025, D-031).

Acceptance: run wire fixtures through actual validators, envelope functions, SDK parsing and SSE reconnect. Include omitted/empty content, false/zero, future event, incompatible authority version, duplicate command, stale cursor, revoked access and old-client wait rendering. A permissive DAL mock is insufficient (S2/S3/S8/S15).

## Source and configuration map

| Path | Why it matters |
|---|---|
| `packages/backend/convex/schema.ts`, `schema/*`, `_generated/*` | Active schema, modular/BYOD counterparts and generated validators/types. Generated files follow codegen, not hand patches. |
| `packages/backend/convex/chat.ts`, `generation.ts`, `messages.ts` | Current admission, scheduled producer and partial/final mutations. All alternate entries must join the same contract. |
| `packages/backend/convex/convex.config.ts`, `crons.ts`, `http.ts` | Component setup, cron callbacks and verified upload/auth HTTP boundaries. |
| `packages/backend/convex/lib/prompts/`, existing `packages/ai` prompt modules | Operational prompt sources. New UI/routes do not hardcode their own system prompts. |
| `packages/ai/src/models.ts`, web AI re-exports | Central model identity; proposed snapshot resolves executable capabilities/pricing once (D-035). |
| `apps/web/src/lib/api/`, `apps/web/src/app/api/v1/` | REST/SSE/RPC auth, DAL, envelopes and public transport. |
| `packages/byod-schema/convex/schema.ts`, `schema-string.ts`, `scripts/sync-byod-schema.ts` | Generated BYOD deployment surface; staged routing/version proof is S17. |
| `package.json`, `bun.lock`, `turbo.json`, workspace manifests | Bun-only dependency/task contract; scoped commands rather than accidental all-app dev startup. |
| `.github/workflows/`, `docs/packaging.md` | Exact-source release and rollback contracts; desktop suspension and production protection prerequisites. |

Credentials stay in server-owned runtime configuration or encrypted owner-scoped records, never client bundles, artifacts, skills or logs. Inspect existing documented variable names rather than inventing a second environment scheme. BYOK and BYOD settings are not proof that ordinary chat or every HTTP/WebSocket request uses them; [13](13-privacy-safety-compliance.md) states the current gaps (D-022, D-035).

## Migration and release gates

Start with endpoint repairs and existing-field fixes. Add the smallest run/attempt/usage records only when their release needs them; add interactions, checkpoints and optional domains separately. Do not require all proposed tables to exist before securing a source query. [02](02-data-model.md#safe-additive-migration) specifies additive readers/writers, bounded backfills and contraction gates (D-014, D-030, D-032).

Before an authorized release, prove scoped lint/typecheck/tests/build with a complete frozen install (S1); direct endpoint authorization (S2); actual fake-provider action execution/settlement (S3); and the changed clients' compatibility (S15). Any new engine needs park/resume/replay/rollback evidence (S8). Candidate send→partial→refresh→complete must run against the exact candidate, not an unrelated deployed smoke URL. Live calls, sandbox starts and production promotion need separate budget/authorization; the existing production-environment blocker must be verified resolved, not assumed (D-030, D-033).
