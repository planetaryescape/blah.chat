# Phase 5: Conversation Tree And CRUD

Status: complete as of March 16, 2026.
Completed work:
- Postgres-backed conversation and message DAL added for the main web chat path
- active-path message reads, regenerate flows, and branch switching moved onto REST routes
- tree payloads now include parent and active-branch metadata needed by the chat UI
- sidebar conversation CRUD now uses Postgres-backed REST mutations for rename, delete, archive, pin, and star
- new-chat bootstrap, empty-conversation reuse, and template chat creation now create or update conversations through the Postgres-backed API
- branch badge now derives branch state from the cached message tree instead of Convex branch queries

Residual Convex references still in the repo are not blockers for this phase:
- search and command-palette conversation search
- export endpoints
- comparison consolidation helpers
- model recommendation and token-usage helpers
- admin and maintenance tooling

Those move in later phases because they depend on search, comparison, or cleanup work outside the core tree CRUD contract.

## Goal

Build the basic Postgres-backed conversation and message APIs, with branch-safe reads and writes.

## Program Context

blah.chat conversations are trees. Normal sends, edits, regenerations, comparison siblings, and branch switching all depend on this. This phase builds the non-streaming app surface on top of the canonical tree schema.

## Why This Phase Comes Before Blobs And Generation

The app needs the core tree read/write model working before layering attachments or streaming behavior on top of it.

## Prerequisites

- phases 1 through 4 complete

## Deliverables

- create/list/update/archive conversation APIs
- fetch active branch path
- fetch siblings for a node
- switch active branch
- create edit/regenerate branches at the data-model level

## What To Build

- conversation repository
- message repository
- recursive query helpers for active path derivation
- branch switch mutation that updates `active_leaf_message_id`
- sibling queries ordered by `sibling_index`
- active-path read model for rendering the visible conversation

## Key Rules

- active branch is derived from `active_leaf_message_id`
- parent-child relationships come from `message_edges`
- edits and regenerations create new nodes, they do not overwrite old nodes
- branch switching changes the pointer, not the history

## Comparison Interaction

This phase does not implement comparison streaming yet, but the data model must already support sibling assistant nodes cleanly.

## Risks

- accidentally rebuilding a flat chat list abstraction
- mutating messages in place during edit/regenerate
- duplicating active-path logic in multiple layers

## Verification

- create a conversation
- add a linear chain of messages
- fork from an earlier message
- switch active branch
- verify active path changes without deleting history

## Done Criteria

- the tree can be read and navigated reliably
- branch operations are represented correctly in Postgres
- main web conversation CRUD entry points no longer depend on Convex for their core read or write path

## What Comes Next

Once core tree CRUD is solid, phase 6 can move attachments and blob storage to R2.
