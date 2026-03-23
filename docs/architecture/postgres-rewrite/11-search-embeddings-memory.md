# Phase 11: Search Embeddings Memory

Status: in progress as of March 23, 2026.

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

## What Comes Next

Remaining phase-11 work is now broader embedding/retrieval parity, not note/task CRUD surface migration.
