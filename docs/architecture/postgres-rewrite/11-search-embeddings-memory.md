# Phase 11: Search Embeddings Memory

Status: complete as of March 25, 2026.

## Goal

Port search, embedding storage, and retrieval-heavy memory features from Convex to Postgres plus Trigger.

## Program Context

Convex currently handles vector indexes and search indexes for many entities. The rewrite must replace that explicitly with pgvector and Postgres full-text search, while preserving hybrid retrieval quality.

## Why This Phase Comes After Router

The core chat runtime, comparison mode, offline behavior, and router should already be stable before deep retrieval systems are migrated. Retrieval work is large and should not block the streaming overhaul.

## Prerequisites

- phases 1 through 10 complete

## Deliverables

- pgvector-backed embeddings
- `tsvector` + GIN full-text indexes
- hybrid search with reciprocal rank fusion
- Trigger-based embedding generation and backfills
- memory retrieval parity

## Entities To Cover

- messages
- memories
- tasks
- notes
- file chunks
- knowledge chunks
- routing examples

## Retrieval Rules

- preserve hybrid search, do not regress to vector-only
- scope by user and conversation where appropriate
- keep retrieval APIs normalized and explicit

## Background Work

Embedding generation and reindexing should run in Trigger tasks, not inside user request handlers.

## Risks

- underestimating search quality regressions
- vector-only shortcuts that lose relevance
- attempting full backfills in request paths

## Verification

- compare current and new search results for sampled queries
- test file and memory retrieval
- validate hybrid RRF behavior
- verify project knowledge, notes, and tasks surfaces read/write through Postgres routes instead of Convex

## Done Criteria

- search quality is at least as good as the current app
- embedding generation is job-driven and durable

## Evidence So Far

- `/api/v1/search/hybrid` and the main web search hooks now use Postgres-backed REST
- memories CRUD, consolidate, and recent-scan are on Postgres + Trigger-backed routes
- project knowledge/file surfaces are on Postgres-backed routes
- project notes/tasks now have Postgres tables, generated Drizzle migration coverage, project-scoped REST routes, and web project-page hooks/UI on the new stack
- global `/notes` and `/tasks` now use top-level Postgres REST routes, hooks, and dedicated workspaces instead of the old Convex cache/dashboard surfaces
- pgvector extension enabled; all 7 embedding tables migrated from jsonb to native `vector(1536)` type with HNSW indexes
- tsvector generated columns + GIN indexes on 6 entity tables for Postgres-native full-text search
- hybrid search (message + memory) rewritten to use SQL-level `<=>` cosine distance and `search_tsv @@ plainto_tsquery` instead of application-level scoring
- shared search utilities (`mergeByRrf`, `cosineSimilarity`, `serializeVector`) extracted to `@blah-chat/persistence-postgres`
- Drizzle `customType` for pgvector `vector(N)` column type
- Trigger jobs for embedding generation: `embed-message`, `embed-note`, `embed-task` (+ existing `embed-file`, `extract-memories`)
- `extract-memories` dedup upgraded from JS-level cosine similarity to SQL-level `<=>` operator
- backfill infrastructure: `backfill-message-embeddings`, `backfill-note-embeddings`, `backfill-task-embeddings` Trigger tasks
- note/task creation and update automatically trigger embedding generation
- message embedding triggered on generation completion via `GenerationV2Service` background tasks
- PGlite test bootstrap loads vector extension for real pgvector test coverage
- migration `0008_phase11_pgvector_fts.sql` covers all schema changes

## What Comes Next

Phase 11 embedding/retrieval infrastructure is complete. Remaining work:
- run backfill tasks against production data to populate embeddings for existing entities
- compare search quality before/after with sampled queries
- monitor HNSW index performance under load
