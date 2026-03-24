# Postgres Rewrite Program

This directory is the execution plan for rewriting blah.chat from the current Convex-centered runtime to:

- Neon Postgres + Drizzle
- pgvector + Postgres full-text search
- Upstash Redis for live stream, resume, and cancel
- Cloudflare R2 for blobs
- Clerk direct auth
- Trigger.dev for delayed work, cron, backfills, and long-running jobs
- Vercel AI Gateway + OpenRouter as the default provider layer

The rewrite must preserve the product behaviors that matter:

- fast streaming that feels close to direct provider speed
- durable resume across refresh and reconnect
- conversation messages as a tree, not a flat log
- easy branch switching and resilient edit/regenerate flows
- comparison mode as a first-class feature
- offline send queue and local-first UX
- auto-router behavior, rebuilt around real runtime outcomes
- search, memories, files, tools, and embeddings

Execution rules:

1. Work phases strictly in order.
2. Do not start the next phase until the previous phase is green.
3. No feature flag. This is a hard rewrite on a branch, then a hard cutover.
4. After each phase: tests, manual verification, perf check, commit.
5. Dead code deletion is a planned phase, not an optional cleanup.

Execution status:

- Complete: 5 / 17 phases
- In progress: 7 / 17 phases
- Not started: 5 / 17 phases

Phase status snapshot:

| Phase | Status | Notes |
| --- | --- | --- |
| 01 | Complete | Architecture pack written and locked in `/docs/architecture/postgres-rewrite` |
| 02 | Complete | Audited on `codex/postgres-rewrite`: centralized Postgres/Redis/R2/Trigger env + client path exists and health route now checks all four dependencies |
| 03 | Complete | Audited on `codex/postgres-rewrite`: missing rewrite tables, indexes, PGlite bootstrap, and generated Drizzle migration artifacts are now present and test-validated |
| 04 | Complete | Audited on `codex/postgres-rewrite`: Clerk-only auth + JIT Postgres user creation now works across conversations, preferences, webhook sync, and the user DAL; only the isolated non-`v1` legacy callback remains on Convex auth by design |
| 05 | In progress | Audited REST coverage is now green for create/get/update/delete/archive/pin/star plus branch edit/regenerate/delete/switch flows; remaining parity work is narrower follow-up surface audit |
| 06 | In progress | Chat attachment upload/read path moved to R2 + Postgres; other blob flows still pending |
| 07 | Complete | Audited on `codex/postgres-rewrite`: single-model generation now has durable Redis→Postgres resume fallback, durable stop semantics that preserve partial assistant text, and CLI chat send/resume/stream cut over to API-key Postgres generation-v2 routes |
| 08 | In progress | Backend comparison runtime exists; more UI/app-surface parity still pending |
| 09 | In progress | Web send/replay now preserves branch context + client ids, refresh can discover active requests, the shared SDK now exposes request-stream APIs, and mobile HTTP mode can resume/stream generation events; durable offline replay parity and broader mobile surface audit still remain |
| 10 | In progress | Generation-v2 now routes `"auto"` requests through classifier or hard-rule route labels plus Postgres-backed policy, candidate-score, recent-outcome, provider-health, and sticky-follow-up scoring; decisions/outcomes/feedback are persisted, and sticky route context now prefers the latest routed decision over explicit/manual-default rows |
| 11 | In progress | `/api/v1/search/hybrid`, web search hooks/cards/filter lookups, search bulk bookmark/archive/delete actions, the main memories CRUD/search/consolidate/scan routes, Postgres-backed chat source routes/cache sync, canonical chat attachment extraction enqueue, project knowledge/file surfaces, and both project-scoped plus global notes/tasks routes/hooks/pages now run through Postgres + REST; broader embedding parity still remains |
| 12 | In progress | Trigger `extract-memories`, `transcribe`, `generate-title`, `extract-text`, `analyze-model-fit`, `auto-triage-feedback`, `embed-file`, `enrich-source-metadata`, and `process-source` now have canonical Postgres/REST-backed runtime or user-facing surfaces on the rewrite stack, the old web Trigger bridge has been removed, BYOD health is Trigger-scheduled instead of Convex-cron-scheduled, and manual extraction/transcription/image-generation now start through REST-backed Trigger jobs; remaining work is now broader scheduler/backfill and legacy-domain cleanup outside the canonical chat/knowledge path |
| 13 | Not started | Planned only |
| 14 | Not started | Planned only |
| 15 | Not started | Planned only |
| 16 | Not started | Planned only |
| 17 | Not started | Planned only |

Phase order:

1. [01 Architecture Spec](./01-architecture-spec.md)
2. [02 Infrastructure Setup](./02-infrastructure-setup.md)
3. [03 Postgres Schema](./03-postgres-schema.md)
4. [04 Auth And Identity](./04-auth-and-identity.md)
5. [05 Conversation Tree And CRUD](./05-conversation-tree-and-crud.md)
6. [06 Blob Storage On R2](./06-blob-storage-on-r2.md)
7. [07 Generation V2 Single Model](./07-generation-v2-single-model.md)
8. [08 Comparison Mode](./08-comparison-mode.md)
9. [09 Offline Mobile Resume](./09-offline-mobile-resume.md)
10. [10 Router V2](./10-router-v2.md)
11. [11 Search Embeddings Memory](./11-search-embeddings-memory.md)
12. [12 Trigger Background Jobs](./12-trigger-background-jobs.md)
13. [13 BYOD V1 Bring Your Own Neon](./13-byod-v1-bring-your-own-neon.md)
14. [14 Historical Data Migration](./14-historical-data-migration.md)
15. [15 Full Cutover](./15-full-cutover.md)
16. [16 Dead Code Removal](./16-dead-code-removal.md)
17. [17 Hardening And Observability](./17-hardening-and-observability.md)

Locked decisions:

- App database: Neon Postgres
- ORM and migrations: Drizzle
- Vector search: pgvector
- Live stream and resume: Upstash Redis
- Blob storage: Cloudflare R2
- Auth: Clerk direct, no Convex auth bridge
- Background work: Trigger.dev
- Provider layer: Vercel AI Gateway + OpenRouter
- Web stream transport: SSE
- Mobile live transport: same event protocol over HTTP streaming/SSE-style adapter, polling only as degraded fallback
- BYOD v1: Bring Your Own Neon only, after the core rewrite is stable

Core invariants that every phase must respect:

- The canonical conversation model is a tree.
- `active_leaf_message_id` is the branch pointer.
- Active branch state is derived from the tree, not canonical per-message mutable state.
- Streaming hot paths do not block on database round-trips for every chunk.
- Stop is an explicit control-plane action, not a polling query inside the token loop.
- Comparison mode is not a hack on top of single-model generation; it is part of the core generation model.
- Router quality depends on real outcome logging and comparison data.
- Offline sends must remain durable.
- Resume across refresh should be best-effort but close to mandatory via Redis stream log plus Postgres checkpoints.
