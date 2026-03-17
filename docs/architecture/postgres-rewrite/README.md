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
- In progress: 4 / 17 phases
- Not started: 8 / 17 phases

Phase status snapshot:

| Phase | Status | Notes |
| --- | --- | --- |
| 01 | Complete | Architecture pack written and locked in `/docs/architecture/postgres-rewrite` |
| 02 | Complete | Local infra, clients, env parsing, health checks implemented |
| 03 | Complete | Postgres schema foundation implemented in `@blah-chat/persistence-postgres` |
| 04 | Complete | Main `v1` API auth now uses direct Clerk + Postgres user sync/preferences; Convex token minting removed from normal API middleware |
| 05 | Complete | Core conversation tree CRUD, sidebar CRUD, new-chat bootstrap, and branch badge now use the Postgres-backed API/tree model |
| 06 | In progress | Chat attachment upload/read path moved to R2 + Postgres; other blob flows still pending |
| 07 | In progress | Single-model generation runtime works on new stack for main web chat; broader surface cutover/perf hardening pending |
| 08 | In progress | Backend comparison runtime exists; more UI/app-surface parity still pending |
| 09 | In progress | Web local-first cache/queue path still active on migrated chat path; mobile parity and full resume work still pending |
| 10 | Not started | Planned only |
| 11 | Not started | Planned only |
| 12 | Not started | Planned only |
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
