# Phase 6: Blob Storage On R2

## Goal

Move file, image, and audio storage from Convex storage to Cloudflare R2, using a clean metadata-in-Postgres pattern.

## Program Context

Attachments influence generation, routing, and search. This phase must happen before the new generation stack, because the new generation path must not depend on Convex storage.

## Why R2

R2 is the cheapest fit for this app profile and uses the S3-compatible API, which keeps the code portable.

## Prerequisites

- phases 1 through 5 complete

## Deliverables

- R2 upload and download flows
- signed URL support
- attachment metadata persisted in Postgres
- migration path away from Convex storage ids

## What To Build

- object key strategy for user, conversation, and message scoped blobs
- signed upload endpoint
- signed read endpoint or public delivery strategy
- attachment create and read repositories
- R2-specific error handling and limits

## Object Model

Postgres stores:

- attachment id
- message id
- conversation id
- user id
- bucket/key
- content type
- size
- media metadata

R2 stores the bytes only.

## Important Rules

- do not put large blobs in Postgres
- do not keep Convex `_storage` ids in the new canonical model
- keep attachment records normalized and reusable

## Risks

- mixing legacy Convex storage identifiers with new R2 keys
- breaking attachment references during message migration
- letting upload auth diverge between app surfaces

## Verification

- upload image/file/audio
- attach to message
- read back from signed URL
- render in chat

## Done Criteria

- all new blob writes use R2
- attachment metadata is canonical in Postgres

## What Comes Next

With attachments migrated, phase 7 can build the new generation runtime without old storage assumptions.

