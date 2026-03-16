# Phase 16: Dead Code Removal

## Goal

Delete the old Convex-specific runtime, transport, and compatibility layers once the new stack is fully live.

## Program Context

This phase exists because dead infrastructure code is not harmless. It causes future confusion, hidden maintenance cost, and accidental regressions.

## Why This Phase Comes After Full Cutover

Deleting old code before the app is fully cut over would remove fallback paths prematurely. Deleting it after cutover makes the repository understandable again.

## Prerequisites

- phases 1 through 15 complete

## Delete Categories

- Convex transport paths
- Convex auth providers
- partial-content streaming transport
- stop polling loop logic
- `useStreamBuffer`
- old SSE polling routes
- old mobile polling transport
- Dexie assumptions tied to Convex live sync
- Convex BYOD packaging and health system
- stale tests and docs for removed behavior

## Important Rule

Remove code only after proving the new path is live and correct. But once that proof exists, delete aggressively.

## Risks

- keeping “just in case” dead code forever
- leaving docs that describe removed systems
- partial deletions that retain hidden dependencies

## Verification

- search for legacy Convex runtime references
- run tests
- manually verify no route still depends on removed modules

## Done Criteria

- old runtime code is gone
- repository describes the current system, not the old one

## What Comes Next

With the codebase cleaned up, phase 17 focuses on hardening, observability, and production confidence.

