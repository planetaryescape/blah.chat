# Phase 14: Historical Data Migration

## Goal

Build and run the migration tooling that moves historical data from Convex and Convex storage into Postgres and R2.

## Program Context

By this phase the new stack already exists. The remaining task is moving real production history without losing tree relationships, comparison groups, attachments, or search-relevant metadata.

## Why This Phase Comes Near The End

The target schema and runtime must be stable before historical migration is attempted. Migrating early would guarantee rework.

## Prerequisites

- phases 1 through 13 complete

## Deliverables

- export tooling for Convex data
- transform tooling to the new schema
- import tooling for Postgres and R2
- validation and parity reports

## Data To Migrate

- users
- conversations
- messages
- tree relationships
- comparison groups
- votes and consolidations
- attachments and blob metadata
- search-relevant text and source metadata
- router-related historical data if worth keeping

## Migration Rules

- preserve message ids or store deterministic legacy mapping
- preserve branch topology
- preserve comparison group relationships
- preserve attachment-message links
- backfill derived fields where needed

## Validation Strategy

- row counts by entity
- sample conversations with branches
- sample comparison groups
- sample attachments
- sample search and retrieval behavior

## Risks

- flattening or corrupting the tree
- losing attachment references
- importing legacy derived state as canonical state

## Verification

- dry run on staging data
- inspect a representative set of migrated conversations manually
- compare key metrics before and after

## Done Criteria

- migration tooling is repeatable
- parity checks are acceptable
- production cutover can proceed with confidence

## What Comes Next

After historical data is ready, phase 15 can cut all app surfaces over to the new runtime.

