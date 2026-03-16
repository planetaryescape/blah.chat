# Phase 7: Generation V2 Single Model

Status: implemented backend slice on March 16, 2026.
Implemented:
- Postgres-backed `generation_request` + `generation_session` creation
- Redis-backed event log
- SSE stream route
- explicit stop route
- checkpoint persistence
- targeted Vitest coverage for complete/stop flows
Still pending for full phase closure:
- wire the primary UI send/listen flow to these endpoints
- replace old Convex-backed send path
- measure end-to-end UX in the live app

## Goal

Build the new single-model generation runtime with fast streaming, explicit cancel, and durable resume.

## Program Context

The current streaming path is slowed by awaited database work inside the token loop and extra client-side smoothing. This phase replaces that path with a split system:

- Postgres for canonical messages and coarse checkpoints
- Redis for live stream, resume log, and cancel signals
- SSE for web delivery

## Why This Phase Is The Center Of The Rewrite

This phase fixes the main UX problem: slow-feeling streaming after the first token. It also establishes the runtime model that comparison mode, offline resume, and router logging depend on.

## Prerequisites

- phases 1 through 6 complete

## Deliverables

- send API for single-model chats
- generation worker/service
- Redis-backed live stream log
- SSE endpoint
- explicit stop endpoint
- Postgres checkpointing
- final message persistence

## Runtime Model

Request path:

1. create user message
2. create assistant placeholder
3. create `generation_request`
4. create one `generation_session`
5. start worker

Worker path:

1. call provider
2. publish deltas to Redis stream log
3. push deltas to connected clients
4. checkpoint to Postgres every `250-500ms` or `1-2KB`
5. finalize message and session on completion

## Stop Semantics

- stop is a control-plane action
- worker listens for cancel via Redis
- Postgres records durable stop intent and terminal state
- do not poll the database inside the hot token loop

## Resume Semantics

- reconnect first tries Redis live log
- if live log unavailable, resume from latest Postgres checkpoint
- final message always comes from canonical Postgres state

## Client Rules

- remove visible stream smoothing from the active message path
- render active deltas raw
- keep expensive markdown transforms deferred or incremental

## Non-Goals

- no comparison mode yet
- no router-driven selection yet

## Risks

- sneaking awaited database round-trips back into the hot loop
- making Redis the only durability layer
- conflating active-stream view state with canonical message state

## Verification

- measure TTFT
- measure visible tokens/sec
- refresh during generation
- stop during generation
- finish and reload completed message

## Done Criteria

- single-model generation feels materially faster
- stop works without per-chunk DB reads
- resume is reliable

## What Comes Next

Once the single-model runtime is proven, phase 8 can extend the same model to comparison mode.
