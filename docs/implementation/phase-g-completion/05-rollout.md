# 05 — Rollout

5 PRs in strict order. Each merges to `main` independently and is releasable. No long-lived branches.

## PR sequence

### PR 1 — Cat A wire-up sweep
**Branch:** `chore/phase-g-wireup`
**Estimated:** 1.5 hr
**Touches:** ~10 files

Scope from [02-cat-a-wireup.md](./02-cat-a-wireup.md):
- A1 cli-login URL fix
- A2 ShareDialog toggle/extend
- A3 SharePageClient (verify each stub before merging)
- A4 AutoRouterPreferenceModal drop TODOs
- A5 MeetingReviewPanel drop TODO
- A6 SmartAssistantPageClient drop tasks/notes TODOs
- A7 Bible verse relabel
- A8 QuickModelSwitcher pro access (with FREE_DAILY_LIMIT placeholder pointing at PR 4)

**Acceptance:**
- `bun run lint` clean
- `bun run test:run` green
- `bun run build` succeeds
- Manual smoke: CLI login flow E2E, share dialog toggle, smart assistant tasks/notes
- TODO count drops from 69 to ~40

**Risks:** SharePageClient stubs may surface unforeseen missing routes — bump those to PR 4 not PR 1.

**Rollback:** revert PR.

---

### PR 2 — Schema additions only
**Branch:** `feat/phase-g-schema`
**Estimated:** 2-3 hr (mostly migration generation + review)
**Touches:** `packages/persistence-postgres/src/schema.ts`, `packages/persistence-postgres/drizzle/*`, `packages/persistence-postgres/src/index.ts`, `packages/persistence-postgres/src/seeds.ts`, `packages/shared/src/byod/tables.ts`

Scope from [01-schema-additions.md](./01-schema-additions.md):
- `canvasDocuments`, `canvasHistory`, `conversations.activeCanvasDocumentId`
- `notifications`
- `userOnboarding`
- `adminSettings`
- `autoRouterConfig`
- `modelOverrides`, `modelChangeLog`
- BYOD allowlist update for `userOnboarding`
- Default seed constants in `seeds.ts`
- Type re-exports from `index.ts`

**Acceptance:**
- `bunx drizzle-kit generate` produces 5 migration files (review SQL diffs)
- `bun run test:run -F @blah-chat/persistence-postgres` green (PGlite picks up new tables)
- Typecheck across web/mobile/cli passes
- Migration runs idempotently against PGlite + a real Neon instance

**Risks:**
- `conversations.activeCanvasDocumentId` ALTER on a large table — check Neon's online ALTER semantics. With nullable text column and no default, this is metadata-only and cheap.
- BYOD users who already migrated need the new tables added to their schemas. The BYOD migration runner already handles allowlist deltas — verify by running `bunx tsx packages/migration/src/cli.ts byod-sync --dry-run`.

**Rollback:** drop migrations, revert.

---

### PR 3 — Cat C feature backends
**Branch:** `feat/phase-g-feature-backends`
**Estimated:** 2 days
**Touches:** ~50 files (8 persistence + 11 DAL + 31 routes from §C subset)

Scope from [04-cat-c-features.md](./04-cat-c-features.md):
- All persistence helpers
- All DAL files
- All route handlers for canvas, notifications, onboarding, admin settings, admin models, auto-router config, /usage/*, /admin/usage/*, /admin/byod/*, models merged list, public-features, public auto-router
- Tests for each route + DAL

Excludes:
- Wire-up (PR 5)
- Cat B routes that don't depend on PR 2 schema (B1 import, B6 meeting extraction, B7 notes tags, B10 model preview, B11 dismiss) — those go in PR 4

**Acceptance:**
- All routes return 200 / 401 / 403 / 404 / 409 / 400 as appropriate
- Each route has at least one happy-path + one auth-failure test
- Unit tests for each DAL method
- Persistence tests for canvas conflict-resolution edge cases
- `bun run test:run` green
- No new TODO markers introduced

**Risks:**
- Canvas conflict resolution is the trickiest. Add fuzz tests for concurrent updates.
- Notification producer side-effects — only wire share-view producer in PR 3; other producers (comparison-complete, generation-failed, byod-health) deferred to PR 5 to keep this PR focused on the API surface.

**Rollback:** safe — no consumers wired yet, so reverting only loses the new endpoints.

---

### PR 4 — Cat B remaining routes
**Branch:** `feat/phase-g-cat-b-routes`
**Estimated:** 1 day
**Touches:** ~16 files

Scope from [03-cat-b-routes.md](./03-cat-b-routes.md):
- B1 `/api/v1/import/conversations`
- B6 `/api/v1/actions/extract-meeting`
- B7 `/api/v1/notes/[id]/tags`
- B10 `/api/v1/conversations/[id]/model-preview`
- B11 `/api/v1/conversations/[id]/model-recommendation/dismiss` (if not already existing)
- B5 refactor: extract `usageAggregates.ts` shared helpers (used by both `/usage/*` and `/admin/usage/*`)

**Acceptance:**
- Same as PR 3 — happy path + auth failure + edge cases
- Import handles partial failure gracefully
- Meeting extraction logs `usageRecords` correctly

**Risks:**
- Meeting extraction prompt may have drifted post-migration. Verify prompt copy is preserved or recreated correctly. Check git history of `packages/backend/convex/lib/prompts/meetingExtraction.ts` if needed.

**Rollback:** safe.

---

### PR 5 — Wire-up & TODO purge
**Branch:** `feat/phase-g-wireup-final`
**Estimated:** 1 day
**Touches:** ~30 files in `apps/web/src` (no new backend)

Scope:
- Replace every remaining stub in canvas, notifications, onboarding, admin settings panels, admin pages, usage page, model picker, model preview modal
- Remove every `// TODO: Phase G` and `// TODO: Phase 15` literal from `apps/web/src` (CI check below)
- Wire notification producers (share-view, comparison-complete, generation-failed)
- Wire `useModels()` to merged-config endpoint with static fallback
- Wire `useAdminSettings()` consumer hook + feature gating in `ChatConversationPageClient` etc.
- Add `loadAutoRouterConfig()` server-side cache hook
- Update mobile/desktop/CLI **only if** their fetch URLs need to match (e.g. if mobile reads admin settings — likely not)

**CI check (new):** add to `.github/workflows/ci.yml`:
```yaml
- name: No Phase G TODOs left
  run: |
    if rg "TODO:?\s*Phase\s*(G|15)" apps/web/src --type ts --type tsx; then
      echo "Phase G TODOs remain; PR 5 not complete."
      exit 1
    fi
```

**Acceptance:**
- Zero `Phase G` / `Phase 15` markers in `apps/web/src/**`
- Manual e2e walk: every page that previously rendered stub data now renders real data with empty/loading/error states
- Lighthouse + RAMS spot-check on changed pages (no regressions)
- Mobile + desktop builds still green
- `bun run test:e2e` covers each surface

**Risks:**
- Wiring breaks existing UX if loading/empty states aren't handled. Audit each stub for its empty-state assumptions.
- Adding feature gates may hide UI for existing users — gate defaults to ON for all features in `defaultAdminSettings`.

**Rollback:** revert; existing stubs still work because the routes/tables stay (added in PR 3/4).

---

## Cleanup PR (optional, after PR 5)

**Branch:** `chore/phase-g-cleanup`

- Delete `packages/persistence-convex/` (empty package)
- Delete stashes on `codex/postgres-rewrite` after confirming no salvage value
- Delete merged branches: `fix/admin-users-postgres`, `fix/postgres-env-bootstrap`, `codex/postgres-rewrite`
- Strip `convexUrl` from `apps/cli/` config (BYOD pointer is no longer Convex-shaped)
- Drop `*.convex.cloud` image hostname from `apps/web/next.config.ts`
- Rename `apps/mobile/lib/convex.ts` → `apps/mobile/lib/entityTypes.ts`, update imports
- Update `apps/cli/` config schema: rename `convexUrl` → `apiUrl` (deprecate convexUrl with one-version compat shim)

---

## Risk register

| Risk | Mitigation |
|---|---|
| Schema migration on prod Neon hits a large `conversations` table | Migration is metadata-only ALTER; safe. Tested on PGlite first. |
| Notification producer floods inbox | All producers gated by `adminSettings.features.notifications`. Default ON, but rate-limited per type per user (1/min) at insert site. |
| Canvas conflict resolution loses data | History table is append-only. Worst case reconciles by replay. Add a "history full export" admin tool in cleanup PR. |
| Auto-router config drift across cached + DB value | 30s TTL acceptable. PATCH busts cache via in-memory revision counter. |
| Static MODEL_CONFIG drifts from `modelOverrides` | Periodic CI lint compares static IDs to override IDs; alerts if `modelOverrides.modelId` references a removed static model. |
| Free-tier daily limit hardcoded in PR 1, drives wrong limits in prod | `FREE_DAILY_LIMIT` constant explicitly TODO-tagged with PR 4 reference. PR 4 swap is one-line. |

## Acceptance for the whole project

After PR 5 is merged:

- `rg "TODO:?\s*Phase\s*(G|15)" apps/web/src` returns zero hits
- All TODO surfaces render real data:
  - [ ] Admin/users list & detail
  - [ ] Admin/usage
  - [ ] Admin/byod
  - [ ] Admin/auto-router
  - [ ] Admin/models list & detail (with history)
  - [ ] Admin settings (limits, search, memory, transcript, features)
  - [ ] Usage page (current user)
  - [ ] Settings/import flow
  - [ ] CLI login
  - [ ] Share page + dialog (toggle, extend, view, clone, vote)
  - [ ] Smart Assistant (extract meeting, tasks, notes)
  - [ ] Notifications bell with real producer events
  - [ ] Onboarding tour with real persistence
  - [ ] Canvas: open/edit/save/history/restore/conflict-resolve
  - [ ] Notes tags (add/remove)
  - [ ] Model preview modal
  - [ ] Quick model switcher pro access check
  - [ ] Auto-router preference modal
- `models/repository.ts` has zero `Phase 15` markers; all hooks return real data or admin-gated `undefined`
- BYOD allowlist matches schema reality (no orphan table names)
- Production Neon instance has all 7 new tables migrated
- Mobile + desktop + CLI still build and pass CI

## Estimated total effort

5-6 working days, distributed:

| PR | Hours |
|---|---|
| PR 1 | 1.5 |
| PR 2 | 2-3 |
| PR 3 | 14-16 |
| PR 4 | 7-8 |
| PR 5 | 7-8 |
| **Total** | **~32-37 hours** |

Single-engineer, focused work. PRs 1-2 can land same day.

## Open questions

1. **Realtime canvas:** polling for v1, SSE for v2 — when do we want v2? Track as separate epic.
2. **Notification realtime:** same — polling for v1.
3. **Custom models in `modelOverrides`** — do they pick up routing/auto-router weights? Treat as same-shape as static models; verify auto-router consumers don't crash on unknown `modelId`.
4. **Per-class auto-router weight UI:** the `AutoRouterConfigValue` schema includes per-class weights. Does the existing `/admin/auto-router/page.tsx` UI cover this? — verify and extend if not.
5. **Public `/api/v1/models` route:** should non-admins see deprecated models? Current static behaviour hides them. Match.
6. **Comparison-complete notification producer:** which exact event fires it? "all assistants in a comparison group have completed"? Verify with comparison consolidation logic in PR 5.
