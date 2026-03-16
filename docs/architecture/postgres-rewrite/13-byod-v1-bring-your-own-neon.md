# Phase 13: BYOD V1 Bring Your Own Neon

## Goal

Redesign BYOD around Postgres, starting with a tightly scoped and supportable v1: Bring Your Own Neon.

## Program Context

Current BYOD is deeply Convex-specific. It assumes a user-owned Convex deployment and Convex-compatible schema packaging. The rewrite moves the app to Postgres, so BYOD must become a Postgres-native design.

## Why This Phase Comes Late

BYOD is a separate product surface with a high support burden. It should not block the core runtime rewrite. The core stack must exist and be stable first.

## Prerequisites

- phases 1 through 12 complete

## Scope Decision

V1 supports Neon only.

It does not support:

- arbitrary Postgres connection strings
- Supabase
- RDS
- self-hosted Postgres
- user-owned Redis
- user-owned blob storage

Those can come later if needed.

## Deliverables

- BYOD connection model for Neon
- encrypted Neon credentials or connection config
- remote Drizzle migration runner
- schema version and health tracking
- Trigger jobs for health checks and migrations

## Product Rule

BYOD only moves the tenant database. Redis, R2, and app control-plane infrastructure remain app-managed in v1.

## Why This Scope Is Correct

- smaller support matrix
- easier onboarding
- consistent pgvector support
- cleaner migration story

## Risks

- trying to support “any Postgres” too early
- tying core app stability to BYOD-specific edge cases
- spreading ownership of state across too many user-managed services

## Verification

- connect a Neon project
- run migrations remotely
- read and write tenant data
- report health and schema version

## Done Criteria

- one guided BYOD path works end-to-end
- the design no longer depends on Convex packaging

## What Comes Next

After BYOD is redesigned, phase 14 can focus on historical data migration from Convex into the new stack.

