# Phase 12: Trigger Background Jobs

## Goal

Move delayed work, scheduled work, long-running work, and backfills from Convex scheduler/actions/crons to Trigger.dev.

## Program Context

The rewrite removes Convex from the core runtime. Many existing asynchronous behaviors currently rely on `runAfter`, internal actions, or Convex crons. Those need a new durable home.

## Why This Phase Comes After Search And Memory

By this point the core runtime, router, and retrieval systems are already defined. That makes it clear which work belongs in the request path and which work belongs in jobs.

## Prerequisites

- phases 1 through 11 complete

## Deliverables

- Trigger jobs for embeddings, extraction, enrichment, title generation, image generation, health checks, cleanup, and backfills
- Trigger schedules replacing Convex crons
- explicit job ownership map

## Good Trigger Candidates

- embeddings
- memory extraction and consolidation
- file text extraction
- knowledge source processing
- source enrichment
- title generation
- image generation
- cleanup and repair
- migrations and backfills
- health checks and scheduled maintenance

## Non-Goals

- active token streaming
- live cancel path
- hot-path request writes

## Important Rule

Anything that must feel immediate to the user stays out of Trigger. Anything durable, delayed, or batch-oriented belongs here.

## Risks

- moving hot-path generation into Trigger
- splitting ownership unclearly between app server and jobs
- recreating hidden scheduler coupling

## Verification

- each migrated job can be triggered manually
- schedules run correctly
- failure and retry behavior is visible

## Done Criteria

- no important asynchronous app flow depends on Convex scheduler
- Trigger owns the background workload cleanly

## What Comes Next

With the core app stable and background work moved, phase 13 can redesign BYOD as a separate Postgres-based product surface.

