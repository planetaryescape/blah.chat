# Phase 3: Postgres Schema

## Goal

Design and implement the canonical Postgres schema, with the message tree as a first-class data model.

## Program Context

The rewrite moves canonical app state from Convex to Postgres. This schema must support normal chats, comparison mode, branching, tools, attachments, routing, checkpoints, and future BYOD.

## Why This Phase Matters

The schema is the real architecture. If the tree, generation, and comparison model are wrong here, later phases will either be fragile or impossible.

## Why This Phase Comes Before Auth And CRUD

App-level CRUD and identity code must target real tables and indexes, not guesses.

## Prerequisites

- phase 1 complete
- phase 2 complete

## Required Invariants

- conversations are trees, not flat lists
- branch switching is cheap
- merges are possible
- active branch state is derived
- comparison mode fits naturally
- checkpoints and router logs have dedicated storage

## Core Tables

- `users`
- `conversations`
- `messages`
- `message_edges`
- `attachments`
- `generation_requests`
- `generation_sessions`
- `generation_checkpoints`
- `comparison_votes`
- `consolidations`
- `routing_policies`
- `routing_decisions`
- `routing_candidate_scores`
- `routing_outcomes`
- `routing_feedback`
- `provider_health_snapshots`

Search and embedding tables are added structurally now, even if populated later:

- `message_embeddings`
- `memory_embeddings`
- `task_embeddings`
- `note_embeddings`
- `file_chunks`
- `knowledge_chunks`
- `routing_examples`

## Tree Model

Canonical fields:

- `conversations.active_leaf_message_id`
- `messages.root_message_id`
- `messages.sibling_index`
- `messages.fork_reason`
- `message_edges.parent_message_id`
- `message_edges.child_message_id`
- `message_edges.position`
- `message_edges.edge_type`

Do not make `messages.is_active_branch` canonical. It can be derived with recursive queries from `active_leaf_message_id`.

## Comparison Model

- one user send creates one `generation_request`
- comparison mode creates N `generation_sessions`
- assistant siblings live under the same parent user message
- `comparison_group_id` ties sibling assistant messages together

## Generation Model

- `generation_requests` track top-level send intent
- `generation_sessions` track per-model execution
- `generation_checkpoints` track coarse durability snapshots

## Indexing Requirements

- conversation reads by user and recency
- message reads by conversation and creation time
- message tree reads by root and parent-child edges
- sibling reads ordered by `sibling_index`
- generation lookups by request, message, status
- routing and outcome lookups by time, route, model, user

## Migration Notes

- use Drizzle migrations only
- prefer normalized schema over JSON blobs
- use foreign keys and explicit delete strategy

## Risks

- flattening merge-capable parent arrays into a single parent field
- persisting too much derived branch state
- skipping indexes needed for branch traversal

## Verification

- create a conversation tree with edit/regenerate forks
- switch active leaf
- derive active path with a recursive query
- insert a comparison group with sibling assistant messages

## Done Criteria

- migrations are stable
- tree operations work
- comparison structures fit the schema naturally

## What Comes Next

Once the schema is real, auth and user identity can move onto it in phase 4.

