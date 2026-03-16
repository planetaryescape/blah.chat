# Phase 8: Comparison Mode

Status: in progress as of March 16, 2026.
Implemented:
- one request with multiple child sessions
- sibling assistant placeholders under one user message
- parallel processing across selected models
- multiplexed event log carrying `requestId`, `sessionId`, `assistantMessageId`, and `modelId`
- whole-request stop and per-model stop endpoints in the backend slice
- targeted Vitest coverage for multi-model completion
- main chat branch payloads and regenerate flows now align with Postgres-backed sibling message handling
Still pending for full phase closure:
- complete broader comparison UI parity, including any remaining vote/consolidation surfaces
- connect comparison outcomes into the later router logging pipeline

## Goal

Implement comparison mode as a native part of generation v2, not as a special-case bolt-on.

## Program Context

Comparison mode is a real product feature. One user send can generate multiple sibling assistant responses in parallel. The rewrite must model this explicitly.

## Why This Phase Comes Right After Single-Model Generation

Comparison mode should reuse the same runtime architecture as single-model generation. Building it later would force rework. Building it earlier would be harder without the validated single-model path.

## Prerequisites

- phases 1 through 7 complete

## Deliverables

- parent `generation_request` with N child `generation_sessions`
- multiplexed stream endpoint for a comparison request
- sibling assistant message creation
- per-model stop and whole-group stop
- voting and consolidation

## Data Model

- one user message
- N assistant sibling messages under that parent
- one `comparison_group_id`
- one `generation_request`
- N `generation_sessions`

## Streaming Model

Use one request stream for the group. Every event must include:

- `requestId`
- `sessionId`
- `assistantMessageId`
- `modelId`
- `seq`
- `type`
- `delta`

The client demuxes by `assistantMessageId`.

## Tree Interaction

Comparison responses are tree siblings. They must fit the same branch model as edit and regenerate flows.

## Control Semantics

- stop one model without killing the others
- stop the whole comparison group
- request is only fully complete when all child sessions are terminal

## Why This Phase Matters Beyond UX

Comparison mode is also the router evaluation harness. User preference data from side-by-side comparisons is valuable routing feedback and should be logged cleanly.

## Risks

- pretending comparison is just “multiple separate single-model sends”
- leaking session-local events into the wrong message UI
- losing tree correctness for sibling assistant nodes

## Verification

- run 2 to 4 models in parallel
- ensure each streams independently
- stop one child session
- vote on a winner
- consolidate responses

## Done Criteria

- comparison mode works end-to-end on the new stack
- tree invariants remain intact
- router outcome hooks can later consume comparison data

## What Comes Next

With single-model and comparison generation stable, phase 9 can rebuild offline and mobile behavior on top of the same event model.
