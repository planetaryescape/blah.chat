# Phase 4: Auth And Identity

## Goal

Replace Convex auth dependence with direct Clerk-authenticated app APIs backed by Postgres users.

## Program Context

Today the app uses Clerk but still routes identity through Convex-specific providers and token templates in important places. The rewrite removes Convex from the request path. Clerk remains the source of identity.

## Why This Phase Comes Now

Before building CRUD and generation on the new stack, the app needs a stable way to authenticate requests and resolve users in Postgres.

## Prerequisites

- phases 1 through 3 complete

## Deliverables

- direct Clerk auth middleware for app APIs
- Postgres user lookup and upsert
- webhook sync or JIT create behavior
- removal plan for Convex auth bridge code

## What To Build

- API middleware that resolves Clerk user identity
- user repository backed by Postgres
- JIT user upsert for webhook race conditions
- webhook handler that keeps profile fields in sync
- shared auth helpers for web, mobile, desktop, CLI where applicable

## Important Rules

- Clerk is the identity source of truth
- Postgres stores the app user record keyed by `clerk_id`
- no request should need a Convex token after this phase
- auth code must be reusable across app surfaces

## Non-Goals

- no generation yet
- no streaming yet
- no routing yet

## Risks

- leaving old Convex token assumptions in shared clients
- mixing webhook sync and JIT create in conflicting ways
- silently breaking mobile or CLI auth flows

## Verification

- authenticated user can create and fetch a conversation via Postgres-backed APIs
- a first-time signed-in user is created correctly
- webhook and JIT paths converge on the same user row

## Done Criteria

- direct app auth works
- Postgres users are canonical
- later phases no longer depend on Convex auth

## What Comes Next

With identity solved, phase 5 can build conversation and message CRUD on the new schema.

