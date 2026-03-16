# Phase 2: Infrastructure Setup

## Goal

Provision the foundational services and wire them into the app with clean clients and health checks.

## Program Context

The target runtime is Neon Postgres, Upstash Redis, Cloudflare R2, Clerk direct auth, and Trigger.dev. This phase does not build product features. It only creates the reliable substrate the later phases will use.

## Why This Phase Comes After Architecture Spec

Clients, environment variables, and service boundaries depend on the contracts defined in phase 1.

## Why This Phase Comes Before Schema And Features

Feature work should not begin until:

- database access works
- Redis access works
- blob storage access works
- job triggering works

## Prerequisites

- architecture spec complete

## Deliverables

- Neon project and connection strings
- Upstash Redis database and credentials
- R2 bucket, credentials, and allowed origins
- Trigger.dev project and secret
- server-side clients for Postgres, Redis, R2, Trigger
- health endpoint proving all dependencies
- environment variable documentation

## What To Build

- Drizzle database client and migration wiring
- Redis client wrapper for stream log, resume state, cancel signaling, provider health cache
- R2 client using the S3-compatible API
- Trigger client for enqueueing jobs
- startup validation for required env vars
- structured health checks and error logging

## Important Implementation Notes

- keep storage and compute clients isolated in small modules
- do not leak raw env var access across the app
- use one shared S3-compatible abstraction for R2
- use one shared Redis abstraction for stream and control-plane state
- keep provider API clients separate from infrastructure clients

## Non-Goals

- no product reads and writes yet
- no streaming yet
- no search yet
- no data migration yet

## Risks

- mixing local-dev hacks with production configuration
- hiding service failures until deep into later phases
- coupling app logic directly to low-level SDK calls

## Verification

- one route can connect to Neon
- one route can round-trip a Redis key
- one route can issue a signed R2 URL
- one route can enqueue a no-op Trigger task

## Done Criteria

- infrastructure is reachable from the app
- env handling is explicit and documented
- later phases can depend on stable clients

## What Comes Next

With the infrastructure in place, phase 3 can define the canonical Postgres schema safely.

