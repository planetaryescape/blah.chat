# Phase 12: Trigger Background Jobs

Status: in progress as of March 22, 2026.

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

## Current Evidence

- `packages/jobs/src/trigger/extract-memories.ts` now performs memory extraction directly against Postgres instead of calling the legacy Convex HTTP bridge
- `packages/jobs/src/trigger/transcribe.ts` now downloads audio from R2 and calls the STT provider directly instead of routing through legacy Convex transcription internals
- `packages/jobs/src/trigger/generate-title.ts` now reads the active Postgres branch directly, generates the title itself, and persists it without Convex title actions
- `packages/jobs/src/trigger/extract-text.ts` now downloads canonical chat attachments from R2, extracts text directly, and persists extracted text/errors back onto Postgres attachments without Convex attachment actions
- `packages/jobs/src/trigger/check-health.ts` is now a Trigger-scheduled task (`0 */6 * * *` UTC in production), and the old `byod-health-check` entry has been removed from `packages/backend/convex/crons.ts`
- `apps/web/src/lib/generation-v2/service.ts` and `apps/web/src/lib/generation-v2/runtime.ts` now enqueue `generate-title` through Trigger after completed `New Chat` requests on the Postgres runtime
- `apps/web/src/lib/api/dal/messages.ts` now enqueues `extract-text` for extractable canonical chat attachments on the Postgres send path
- `apps/web/src/app/api/v1/memories/extract/route.ts` now starts manual extraction as a real Trigger run and surfaces Trigger-backed job status through `/api/v1/actions/jobs/[id]`
- `apps/web/src/app/api/v1/actions/transcribe/route.ts`, `apps/web/src/components/chat/VoiceInput.tsx`, and `apps/web/src/app/(main)/assistant/page.tsx` now use the REST upload/job contract for transcription instead of direct Convex actions
- `apps/web/src/app/api/v1/actions/images/generate/route.ts`, `packages/api-client/src/client.ts`, and `apps/web/src/components/chat/ImageGenerateButton.tsx` now start manual image generation through REST + Trigger instead of direct Convex `useAction`
- `apps/web/src/app/api/v1/messages/sources/route.ts`, `apps/web/src/app/api/v1/conversations/[id]/sources/route.ts`, `apps/web/src/hooks/useCacheSync.ts`, and `apps/web/src/components/chat/ConversationHeaderMenu.tsx` now read canonical source citations/metadata from Postgres + REST instead of Convex source queries
- `apps/web/src/app/api/v1/projects/[id]/attachments/route.ts` and `apps/web/src/app/(main)/projects/[id]/knowledge/page.tsx` now use the Postgres attachment/source surfaces for project knowledge instead of Convex attachment queries
- `apps/web/src/app/api/v1/trigger/[taskId]/route.ts` has been removed; Trigger no longer hops through the web app to reach Convex task handlers
- the earlier canonical-stack compatibility holdouts `analyze-model-fit`, `auto-triage-feedback`, `embed-file`, `enrich-source-metadata`, and `process-source` now have the required Postgres/REST-backed surfaces, so they are no longer blocking phase-12 cutover on the main chat/knowledge path
- remaining work is now narrower: schedule/backfill cleanup and legacy-domain surfaces outside the canonical rewrite path still need later-phase migration

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
