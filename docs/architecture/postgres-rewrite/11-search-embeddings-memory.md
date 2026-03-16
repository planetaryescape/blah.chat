# Phase 11: Search Embeddings Memory

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

## Done Criteria

- search quality is at least as good as the current app
- embedding generation is job-driven and durable

## What Comes Next

With retrieval moved, phase 12 can migrate the rest of the asynchronous Convex work to Trigger.dev.

