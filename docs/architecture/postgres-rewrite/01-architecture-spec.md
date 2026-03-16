# Phase 1: Architecture Spec

## Goal

Write the final architecture spec before implementation starts. This phase exists to remove ambiguity. If this phase is weak, every later phase will fork or drift.

## Program Context

blah.chat is being rewritten from a Convex-centered runtime to Neon Postgres, Drizzle, pgvector, Upstash Redis, Cloudflare R2, Clerk direct auth, and Trigger.dev. The rewrite must preserve tree-based conversations, comparison mode, fast streaming, resume across refresh, offline queueing, and the model router.

## Why This Phase Comes First

Every later phase depends on shared contracts:

- database tables
- stream event shape
- Redis key strategy
- stop and resume semantics
- branch invariants
- router objective and logging
- job boundaries

Without a written spec, phases 3 through 12 will re-decide the same things in incompatible ways.

## Prerequisites

None.

## Inputs

- current codebase behavior
- current product requirements
- locked infrastructure decisions in `README.md`

## Deliverables

- one architecture spec document
- one schema inventory
- one event contract definition
- one Redis key naming scheme
- one Trigger job ownership map
- one data migration outline

## Required Decisions

- canonical database tables and ownership
- which state lives in Postgres vs Redis vs client cache
- request path vs background path boundaries
- streaming protocol event types
- cancel and resume semantics
- message tree invariants
- comparison-mode generation model
- router input signals and output logs
- blob storage object key patterns
- BYOD scope and non-goals

## Minimum Contents Of The Spec

- System overview diagram
- Data ownership table
- API boundary list
- Stream event schema
- Generation lifecycle
- Message tree rules
- Comparison group rules
- Offline replay rules
- Router decision and outcome logging
- Migration constraints
- Cutover constraints

## Important Constraints

- do not flatten the message tree
- do not use Postgres as the live token transport bus
- do not put token streaming inside Trigger.dev
- do not make `isActiveBranch` canonical
- do not leave stop behavior vague
- do not leave comparison mode unspecified

## Risks

- trying to “spec lightly” and discovering missing invariants later
- leaving router and comparison mode under-specified
- underestimating data migration shape

## Done Criteria

- spec exists in docs
- no unresolved architecture forks remain
- every later phase can point to a stable contract

## What Comes Next

After the contracts are fixed, infrastructure can be created safely in phase 2.

