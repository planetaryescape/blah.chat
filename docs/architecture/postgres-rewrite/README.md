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

- Complete: 17 / 17 phases
- In progress: 0 / 17 phases
- Not started: 0 / 17 phases

Phase status snapshot:

| Phase | Status | Notes |
| --- | --- | --- |
| 01 | Complete | Architecture pack written and locked |
| 02 | Complete | Centralized Postgres/Redis/R2/Trigger env + client path; health route checks all four dependencies |
| 03 | Complete | Canonical schema with 40+ tables, tree model, comparison model, routing tables; PGlite test bootstrap with pgvector |
| 04 | Complete | Clerk-only auth + JIT Postgres user creation; preferences, webhook sync, user DAL all on Postgres |
| 05 | Complete | Full REST coverage for conversation CRUD, branch operations, message tree reads; sidebar mutations on Postgres |
| 06 | Complete | All live blob flows on R2 + Postgres; attachments, images, code-exec, TTS, mobile upload/STT |
| 07 | Complete | Single-model generation with Redis streaming, Postgres checkpoints, durable stop, resume fallback; CLI on API-key routes |
| 08 | Complete | Comparison mode: multiplexed SSE, per-model stop, votes UI, consolidation dialog, routing feedback pipeline connected |
| 09 | Complete | Durable offline queue, mobile HTTP/SSE streaming, reconnect replay, lifecycle bridge, grouped comparison replay |
| 10 | Complete | Policy engine wired into generation pipeline with outcome-weighted scoring, provider health, exploration, shadow routing; feedback loop now includes regenerated, model_switch, both_bad signals; shadow evaluator with adjustable exploration rate |
| 11 | Complete | pgvector + FTS hybrid search, embedding jobs for messages/notes/tasks, backfill infrastructure, memories CRUD, project knowledge/file surfaces |
| 12 | Complete | 20+ Trigger jobs migrated; all scheduled maintenance, embedding, extraction, health checks on Trigger.dev |
| 13 | Complete | BYOD Neon: encrypted credentials (AES-256-GCM), remote migration runner, health checks every 30min, UI settings panel, Neon-only validation |
| 14 | Complete | Migration CLI with 24 entity transformers, blob migration to R2, parity validation, tree integrity checks |
| 15 | Complete | All app surfaces on HTTP transport; CLI Convex provider removed; prompts extracted to @blah-chat/shared/prompts; mobile type aliases standalone |
| 16 | Complete | CLI Convex files deleted; job prompt imports migrated to shared package; mobile Convex type imports replaced with standalone types; convex deps removed from CLI, mobile, jobs; root convex scripts removed |
| 17 | Complete | Operational runbooks (6 scenarios), alert thresholds (8 SLAs), metrics collection job (5min cron), Slack webhook alerts, Pino structured logging, k6 load test script |

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
