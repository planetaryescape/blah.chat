# Phase 9: Offline Mobile Resume

## Goal

Rebuild the local-first layer so offline sends, reconnect, refresh, and mobile parity remain strong on the new stack.

## Program Context

Today the app gets a lot of resilience from Convex subscriptions plus a local mutation queue. The rewrite removes Convex from transport, so those guarantees need an intentional replacement.

## Why This Phase Comes After Comparison Mode

Offline replay and resume must understand both single-model and comparison requests. Building them before comparison mode would create incomplete assumptions.

## Prerequisites

- phases 1 through 8 complete

## Deliverables

- durable local mutation queue on web and mobile
- settled-message local cache
- reconnect replay flow
- refresh resume flow
- mobile live stream adapter using the same event schema

## Local Queue Requirements

Queue records must store enough to fully replay the send:

- conversation id
- parent or branch context
- content
- selected model or selected models
- attachments
- client ids
- timestamps and retry counters

## Resume Model

- active generation state lives in Redis stream log plus Postgres checkpoints
- local client reconnects to the request stream
- if stream log is unavailable, client resumes from checkpoint
- settled messages are cached locally for fast reload and offline read

## Mobile Rules

- keep the same logical event schema as web
- use a mobile-safe HTTP streaming or SSE-style adapter
- allow degraded polling fallback only when live streaming is unavailable
- do not reintroduce Convex subscriptions as a dependency

## User Experience Rules

- offline sends queue immediately
- reconnect processes the queue automatically
- comparison sends replay as one grouped request, not as unrelated messages
- branch context must survive replay

## Risks

- rebuilding queueing in a way that loses selected models or branch context
- mobile transport diverging from web semantics
- overfitting resume to one happy-path browser case

## Verification

- send while offline
- reconnect and auto-replay
- refresh during single-model generation
- refresh during comparison generation
- validate mobile foreground reconnect flow

## Done Criteria

- offline and reconnect behavior remains durable
- mobile parity exists on the new transport model

## What Comes Next

Once the runtime and client resilience paths are stable, phase 10 can rebuild the router on top of real data.

