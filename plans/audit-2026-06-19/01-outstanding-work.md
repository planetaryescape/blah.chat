# Outstanding Work Audit - 2026-06-19

Scope: outstanding TODO/FIXME/XXX/HACK markers, incomplete/stubbed production code, and planned work in docs that appears unimplemented.

## Methodology

- Read repo instructions: `AGENTS.md`, `CLAUDE.md`.
- Started from `origin/main` on `codex/audit-outstanding-work-2026-06-19`.
- Used `git ls-files`, `rg`, and targeted file reads.
- Searched production code and docs for `TODO|FIXME|XXX|HACK`, `stub`, `stubbed`, `not implemented`, `unimplemented`, `placeholder`, `planned`, `future work`, and related phrases.
- Validated doc claims against current schema, DAL/routes, package exports, and generation runtime wiring.
- Did not mutate source code.

## Findings

| id | priority | issue | evidence file:line | impact | recommended action | confidence |
|---|---|---|---|---|---|---|
| OW-001 | P1 | BYOD table allowlist contains many legacy/nonexistent table names. Mechanical check found missing schema matches for `conversationParticipants`, `conversationTokenUsage`, `toolCalls`, `sources`, `memories`, `files`, `projectConversations`, `projectNotes`, `projectFiles`, `snippets`, `tags`, `bookmarkTags`, `snippetTags`, `noteTags`, `taskTags`, `shares`, `scheduledPrompts`, `votes`, `activityEvents`, `canvasDocuments`, `canvasHistory`. | `packages/shared/src/byod/tables.ts:11`; `packages/shared/src/byod/tables.ts:14`; `packages/shared/src/byod/tables.ts:72`; `packages/persistence-postgres/src/schema.ts:164`; `packages/persistence-postgres/src/schema.ts:196`; `packages/persistence-postgres/src/schema.ts:259` | BYOD schema generation/router can include tables that Drizzle does not define, especially canvas names now implemented as `documents`/`document_revisions`. | Align `BYOD_TABLES` to actual Postgres table names or add an explicit alias layer with tests that fail on missing schema tables. | High |
| OW-002 | P1 | Built-in tool execution is advertised, but generation runtime only passes Composio tools. Renderers exist for many tool names, docs mark most as planned, and landing/onboarding promise code/web/calculator/weather/URL tools. | `apps/web/src/lib/generation-v2/service.ts:442`; `docs/features/tool-calling.md:112`; `docs/features/tool-calling.md:116`; `apps/web/src/app/LandingPageClient.tsx:444`; `apps/web/src/components/onboarding/OnboardingTour.tsx:130` | Users can be told tools exist that the generation path cannot execute unless an external Composio integration supplies them. | Either implement/register built-in tools end-to-end or change product copy/onboarding/docs to describe only currently executable tools. | High |
| OW-003 | P2 | Model-management docs claim static `MODEL_CONFIG` was removed and DB-backed model management is complete, but runtime still exports and falls back to static config. | `docs/models/phase-5-cleanup.md:10`; `docs/models/phase-5-cleanup.md:332`; `docs/models/phase-8-autorouter-integration.md:563`; `docs/models/phase-8-autorouter-integration.md:596`; `packages/ai/src/models.ts:91`; `packages/ai/src/utils.ts:22` | Docs can send maintainers toward a completed migration that did not actually happen; model updates still require code changes for the primary registry. | Mark phase docs historical/incomplete where needed, or file a current model-config migration issue with acceptance checks. | High |
| OW-004 | P2 | Phase G docs are internally stale: README says complete, but child docs still list TODO purge, missing tables, and PR rollout work. Current code has no production `TODO: Phase G` hits and several claimed missing pieces now exist. | `docs/implementation/phase-g-completion/README.md:1`; `docs/implementation/phase-g-completion/00-current-state.md:15`; `docs/implementation/phase-g-completion/00-current-state.md:56`; `docs/implementation/phase-g-completion/05-rollout.md:137`; `apps/web/src/app/api/v1/onboarding/route.ts:1`; `apps/web/src/app/api/v1/notifications/route.ts:1` | Future audits/rewrite work can chase already-shipped TODOs or trust stale gap maps. | Archive these docs as historical snapshots or add a top-level warning to every child file with current status and replacement source of truth. | High |
| OW-005 | P2 | TUI docs contain TODO snippets for conversation opening/model update, but no `apps/tui` implementation exists in this repo. | `docs/tui/phase-2a-convex-integration.md:361`; `docs/tui/phase-4a-conversation-management.md:490`; `docs/monorepo/README.md:200` | TUI work remains plan/spec only; TODO snippets are not backed by shipped code. | Convert TUI docs to a tracked roadmap issue or clearly mark as future design docs. | Medium |
| OW-006 | P3 | Task ordering is planned but not wired: schema has `tasks.position`, docs say drag-drop UI is not implemented, DAL schemas omit `position`, and task workspaces render API order without reorder controls. | `docs/features/smart-manager.md:164`; `packages/persistence-postgres/src/schema.ts:925`; `apps/web/src/lib/api/dal/tasks.ts:25`; `apps/web/src/components/tasks/TasksWorkspace.tsx:178` | Users cannot manually order tasks despite data model support. | Either implement reorder API/UI or remove/defer the position field from user-facing docs. | High |
| OW-007 | P3 | Canvas docs list future enhancements not implemented: realtime collaboration, branching, diff visualization, export formats, templates, auto-detection. | `docs/features/canvas.md:380` | Planned canvas scope is real but untracked in code; useful work can be lost or rediscovered repeatedly. | File discrete product issues only for validated needs; keep the docs as future ideas otherwise. | High |
| OW-008 | P3 | Search/research docs list unimplemented improvements: Google Grounding, personalized ranking, and search analytics. | `docs/research/google-grounding-gemini.md:5`; `docs/tool-optimisation.md:208` | Search quality/observability ideas remain documentation-only and may be mistaken for current capabilities. | Keep as research backlog or close explicitly if product direction is Tavily/Composio only. | Medium |
| OW-009 | P3 | Public/community docs include "coming soon" or planned promises without obvious implementation in repo: Homebrew install, hosted cloud version, Discord community, post-scale security audit. | `README.md:34`; `README.md:131`; `CONTRIBUTING.md:427`; `SECURITY.md:295` | Public docs can overpromise distribution/support/security posture. | Either link to live artifacts when available or reword as roadmap/non-committal future intent. | Medium |

## Explicit Marker Inventory

Production source scan:

- `rg -n --glob '!docs/**' --glob '!**/*.test.*' --glob '!**/__tests__/**' -i '\b(TODO|FIXME|XXX|HACK)\b' apps packages` found no actionable production TODO/FIXME/XXX/HACK comments.
- Non-actionable hits included `proc-macro-hack` in `Cargo.lock`, URL/example `xxx` placeholders, and ordinary UI placeholder text.

Docs marker hits:

| marker area | evidence | disposition |
|---|---|---|
| Phase G historical TODO inventory and rollout | `docs/implementation/phase-g-completion/00-current-state.md:15`; `docs/implementation/phase-g-completion/02-cat-a-wireup.md:3`; `docs/implementation/phase-g-completion/05-rollout.md:137` | Covered by OW-004. |
| Monorepo phase 3 extraction TODOs | `docs/monorepo/phase-3-shared-packages.md:19`; `docs/monorepo/phase-3-shared-packages.md:20` | Mostly stale: `packages/ai` and `packages/shared` now have real exports; broader extraction status still historical. |
| TUI TODO snippets | `docs/tui/phase-2a-convex-integration.md:361`; `docs/tui/phase-4a-conversation-management.md:490` | Covered by OW-005. |
| Research/planning TODO references | `docs/features/tool-calling.md:112`; `docs/research/google-grounding-gemini.md:5`; `docs/tool-optimisation.md:208` | Covered by OW-002 and OW-008. |

## Incomplete/Stubbed Code Scan

- No production TypeScript functions matched `not implemented`, `unimplemented`, `stub`, `stubbed`, or `throw new Error("Not implemented")`.
- `packages/migration/src/transform/attachments.ts:26` sets placeholder storage keys intentionally; `packages/migration/src/run-blobs.ts:277` updates attachment keys after blob migration, so this was not counted as unfinished.
- `apps/web/src/hooks/useKeyboardShortcuts.ts:39` says "placeholder" for Cmd+K, but notes the command palette handles it elsewhere; not counted.
- `packages/jobs/src/trigger/process-source.ts:225` returns a durable placeholder when a YouTube transcript is unavailable; this is degraded behavior, not a stub.

## Skipped / Uncertain Areas

- Did not run full tests/build; audit required reporting, not code changes.
- Did not inspect generated lockfiles, vendored native files, or large eval artifacts beyond excluding false-positive markers.
- Did not verify external availability of cloud service, Discord, Homebrew tap, or professional security audit; findings use repo evidence only.
- Docs marked "historical" were treated as lower-priority unless they directly contradicted current code or contained active-looking TODOs.
