# Phase 15: Full Cutover

Status: not started as of March 16, 2026.

## Goal

Switch every app surface from the old Convex-centered runtime to the new Postgres, Redis, R2, Trigger, and Clerk stack.

## Program Context

The rewrite is not shipping behind a long-lived feature flag. This phase is the deliberate moment where the app stops writing new production traffic to Convex.

## Why This Phase Comes Only After Migration

Cutover without validated schema, runtime, offline behavior, routing, retrieval, jobs, and migrated data would be reckless.

## Prerequisites

- phases 1 through 14 complete

## Deliverables

- web cutover
- mobile cutover
- desktop cutover
- CLI cutover
- production config switch

## Rules

- no new canonical writes to Convex after cutover
- every surface must target the same system contracts
- branch, comparison, router, and offline behavior must be preserved

## Checklist

- switch API clients
- switch transport endpoints
- switch attachment paths
- switch search paths
- switch job triggers
- switch auth expectations

## Risks

- forgetting one non-web surface
- leaving hidden writes to Convex in older clients
- partial cutover that splits state across systems

## Verification

- smoke test all surfaces
- verify writes land only in Postgres and R2
- verify live streaming and stop behavior
- verify comparison mode and branch switching

## Done Criteria

- all production traffic uses the new stack
- Convex is no longer in the live request path

## What Comes Next

After cutover, phase 16 removes the dead code and legacy assumptions still left in the repo.
