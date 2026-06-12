# Phase G Completion Plan

> **Status: COMPLETE (shipped May 2026) — kept for history.**

**Goal:** finish the half-shipped Convex→Postgres migration. Wire every stubbed surface to a real REST route and Postgres-backed DAL. Build, do not cut, the features that don't have tables yet (Canvas, Notifications, Onboarding tracking, Admin Settings, Admin Models, Auto-Router config).

**Date opened:** 2026-05-04
**Owner:** Bhekani
**Status:** Plan only — no code changes yet

## TL;DR

Chat core is solid. Chrome around it is alpha. ~69 `Phase G` / `Phase 15` TODOs across the web app fall into three buckets:

| Bucket | Count | Work |
|---|---|---|
| **Cat A — wire-up only** (route exists, page stubbed) | ~30 TODOs | Repoint `fetch()` URLs, drop TODO comments. ~1.5 hr. |
| **Cat B — REST route build** (DAL exists, route missing) | ~25 TODOs | New routes + reuse existing persistence/DAL. ~half-day. |
| **Cat C — table missing** (feature has no Postgres home) | ~14 TODOs | New tables, new persistence, new DAL, new routes, then wire-up. ~2-3 days. |

We ship in 5 PRs, in this order:

1. **PR 1** — Cat A wire-up sweep. Pure value, zero design decisions.
2. **PR 2** — Cat C schema additions (tables only, no consumers yet).
3. **PR 3** — Cat C feature backends (DAL + routes for canvas/notifications/onboarding/admin-settings/admin-models/auto-router).
4. **PR 4** — Cat B remaining routes (admin/usage, /usage, /import, notes-tags, meeting-extraction, model-preview).
5. **PR 5** — Wire all consumers, delete every `TODO: Phase G` / `Phase 15`. Add e2e for each surface.

## Documents

- [00 — Current state snapshot](./00-current-state.md) — exact TODO inventory, route inventory, gap map
- [01 — Schema additions](./01-schema-additions.md) — every new table, column-by-column
- [02 — Cat A wire-up](./02-cat-a-wireup.md) — pure URL/wiring fixes
- [03 — Cat B routes](./03-cat-b-routes.md) — new REST routes against existing tables
- [04 — Cat C features](./04-cat-c-features.md) — Canvas, Notifications, Onboarding, Admin Settings, Admin Models, Auto-Router
- [05 — Rollout](./05-rollout.md) — PR sequence, acceptance criteria, risks, rollback

## Non-goals

- No removal of features. Canvas stays. Notifications stay. OnboardingTour stays. Admin pages stay.
- No design changes to existing chat-core.
- No Convex code. The migration tool (`packages/migration`) keeps its `convex` dep — it is the migration tool.
- No mobile/desktop/CLI app changes (unless trivially derived from a route change).

## Out of scope (separate work)

- BYOD allowlist alignment (`packages/shared/src/byod/tables.ts` references tables that don't exist yet — `tags`, `noteTags`, `snippets`, `scheduledPrompts`, `activityEvents`, `conversationParticipants`, `conversationTokenUsage`, `projectConversations`, `projectNotes`, `projectFiles`). Track separately.
- Stale stashes on `codex/postgres-rewrite` (reference deleted `packages/backend/convex/*`). Drop after PR 5.
- `packages/persistence-convex` empty package — drop in cleanup PR after PR 5.
