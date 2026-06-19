# blah.chat Audit Backlog - 2026-06-19

Source reports:

- `01-outstanding-work.md`
- `02-half-finished-features.md`
- `03-bugs-vulnerabilities.md`
- `04-concurrency.md`
- `05-code-quality.md`

Scope: full-codebase audit across outstanding work, half-finished features, bugs/vulnerabilities, race/concurrency, and code quality. This is an actionable backlog, not an implementation plan for every item. No P0 was found by the workers; P1 means fix before adding adjacent features.

## Priority Order

1. Fix conversation sharing security first: ownership, password handling, and public read endpoints.
2. Fix generation reliability: stop/finalize race, CLI/mobile stream replay, and mobile offline replay duplication.
3. Fix broken operational workflows: scheduled memory extraction, admin feature settings, BYOD gating/table drift, and cost tracking.
4. Harden risky platform surfaces: Clerk webhook raw-body verification, signed upload policy, code execution validation/envelopes.
5. Clean up stale or overpromising product/docs surfaces only after deciding whether each feature is real product scope.

## P1 - Fix First

| category | source | issue | evidence | recommended action |
|---|---|---|---|---|
| Bugs / vuln | BV-01 | Conversation shares can be created for conversations the caller does not own. | `apps/web/src/app/api/v1/shares/route.ts:8`, `apps/web/src/app/api/v1/shares/route.ts:31`, `apps/web/src/lib/persistence/conversationShares.ts:13`, `packages/persistence-postgres/src/schema.ts:136` | Require authenticated user ownership before inserting a share. Add cross-user share regression tests. |
| Bugs / vuln | BV-02 | Conversation share passwords are accepted and stored as plain text but not enforced on reads. | `apps/web/src/app/api/v1/shares/route.ts:10`, `apps/web/src/lib/persistence/conversationShares.ts:35`, `packages/persistence-postgres/src/schema.ts:1706`, `apps/web/src/lib/persistence/conversationShares.ts:128` | Either remove password creation until complete, or hash passwords and require verification before metadata/conversation/message reads. |
| Concurrency | CONC-01 | Stop can lose to finalization after the last token. | `apps/web/src/lib/generation-v2/service.ts:493`, `apps/web/src/lib/generation-v2/service.ts:531`, `apps/web/src/lib/generation-v2/repository.ts:1543`, `apps/web/src/lib/generation-v2/repository.ts:1476` | Re-check cancellation before final checkpoint/final emit. Make finalization a compare-and-set from expected running state and skip side effects if the row is already terminal/cancelling. |
| Concurrency | CONC-02 | CLI stream consumer lacks per-session sequence guard and expects `started` while server emits `start`. | `packages/streaming-core/src/index.ts:17`, `apps/cli/src/hooks/useMessages.ts:61`, `apps/cli/src/hooks/useMessages.ts:67`, `apps/cli/src/hooks/useMessages.ts:177` | Reuse shared stream parsing/state logic, reset content on `start`, and guard deltas/checkpoints by highest sequence per session. |
| Concurrency | CONC-03 | Mobile stream consumer lacks sequence guards/start reset and can treat first terminal event as whole request completion. | `apps/mobile/lib/chat/messageTree.ts:115`, `apps/mobile/lib/hooks/useMessages.ts:118`, `apps/mobile/lib/hooks/useMessages.ts:135` | Port web request-settled tracking for expected assistant IDs, terminal IDs, and seq high-water marks. |
| Concurrency | CONC-04 | Mobile offline replay is not serialized; reconnect and foreground can process the same queued send. | `apps/mobile/lib/offline/RuntimeBridge.tsx:78`, `apps/mobile/lib/offline/RuntimeBridge.tsx:88`, `apps/mobile/lib/offline/messageQueue.ts:184`, `apps/mobile/lib/offline/messageQueue.ts:194` | Add a replay mutex/lease, atomically claim queue records, and make local conversation creation idempotent. |
| Half-finished | HF-001 | Scheduled memory maintenance posts to a stale/nonexistent extraction trigger route. | `packages/jobs/src/trigger/extract-inactive-conversations.ts:31`, `apps/web/src/app/api/v1/memories/extract/route.ts:78`, `packages/jobs/src/trigger/extract-memories.ts:399` | Replace stale `/api/v1/tasks/extract-memories/trigger` call with the current Trigger task/API contract. Add an integration test around `runMemoryMaintenance`. |
| Half-finished | HF-003 | Admin `features` settings are accepted by schema but not surfaced and not merged on save. | `apps/web/src/lib/api/dal/adminSettings.ts:29`, `apps/web/src/lib/api/dal/adminSettings.ts:34`, `apps/web/src/lib/persistence/adminSettings.ts:51`, `apps/web/src/components/settings/admin/FeaturesSettings.tsx:62` | Merge `patch.features` correctly and either expose real controls or remove/defer the fields until enforced. |
| Code quality | CQ-01 | Operational LLM calls have incomplete/duplicated cost tracking. | `apps/web/src/lib/api/dal/modelPreview.ts:15`, `apps/web/src/lib/conversations/ackGeneration.ts:33`, `apps/web/src/lib/conversations/compaction.ts:84`, `apps/web/src/lib/api/dal/summarize.ts:40` | Create a shared `recordOperationalUsage` helper and require it for all operational `generateText`/`generateObject` calls. Add PGlite tests asserting `usage_records` rows. |
| Product / docs | OW-001, HF-002 | BYOD is both incomplete and internally inconsistent: allowlist has missing/legacy tables; setup UI/backend exists but POST is refused and copy says coming soon. | `packages/shared/src/byod/tables.ts:11`, `packages/shared/src/byod/tables.ts:72`, `apps/web/src/components/settings/BYODSettings.tsx:40`, `apps/web/src/app/api/v1/byod/route.ts:29` | Decide product direction. Either fully hide/defer BYOD, or align tables to actual schema and finish per-user chat DB routing before exposing setup. |
| Product / tools | OW-002, HF-004 | Built-in tool execution is advertised/rendered, but generation only passes Composio tools. | `apps/web/src/lib/generation-v2/service.ts:442`, `docs/features/tool-calling.md:112`, `apps/web/src/app/LandingPageClient.tsx:444`, `apps/web/src/components/onboarding/OnboardingTour.tsx:130` | Either register built-in tools end-to-end behind settings/availability checks, or remove product/onboarding claims until executable. |

## P2 - Next

| category | source | issue | evidence | recommended action |
|---|---|---|---|---|
| Bugs / vuln | BV-03 | Public conversation share UI calls read endpoints that do not exist. | `apps/web/src/app/share/[shareId]/SharePageClient.tsx:74`, `apps/web/src/app/share/[shareId]/SharePageClient.tsx:184`, `apps/web/src/app/api/v1/shares/[id]/route.ts:56` | Implement explicit public read/verify endpoints with authz/password checks, or disable conversation sharing until complete. |
| Bugs / vuln | BV-04 | Clerk webhook verification uses parsed/re-serialized JSON instead of raw body. | `apps/web/src/app/api/webhooks/clerk/route.ts:26`, `apps/web/src/app/api/webhooks/clerk/route.ts:27`, `apps/web/src/app/api/webhooks/clerk/route.ts:34` | Use `await req.text()` and pass raw payload to Svix `Webhook.verify`; parse the verified event. |
| Bugs / vuln | BV-05 | Signed upload URLs allow arbitrary MIME types and have no visible size/type policy. | `apps/web/src/app/api/v1/files/upload-url/route.ts:8`, `apps/web/src/lib/api/dal/files.ts:58`, `packages/persistence-postgres/src/storage.ts:85` | Add context-specific content-type allowlists, max-size enforcement, and safe serving defaults for active content. |
| Bugs / vuln / code quality | BV-06, CQ-04 | Code execution route has weak runtime validation and bypasses common route stack/logging/envelopes. | `apps/web/src/app/api/code-execution/route.ts:93`, `apps/web/src/app/api/code-execution/route.ts:117`, `apps/web/src/app/api/code-execution/route.ts:183`, `apps/web/src/app/api/code-execution/route.ts:235` | Add Zod schema with code length/language/timeout bounds, request size limits, API envelope responses, and structured logging. |
| Half-finished | HF-005 | Convex blob migration uploads knowledge/feedback blobs but does not update corresponding Postgres keys. | `packages/migration/src/transform/knowledge.ts:50`, `packages/migration/src/transform/feedback.ts:53`, `packages/migration/src/run-blobs.ts:182`, `packages/migration/src/run-blobs.ts:277` | Resolve target rows through id maps/placeholders and update `knowledge_sources.storage_key` plus `feedback_entries.screenshot_key`; fail/report missing rows. |
| Half-finished | HF-006 | Image generation backend/SDK/component exists, but no rendered entrypoint; model switcher is inert if mounted. | `apps/web/src/app/api/v1/actions/images/generate/route.ts:19`, `packages/api-client/src/client.ts:676`, `apps/web/src/components/chat/ImageGenerateButton.tsx:81`, `apps/web/src/components/chat/ImageGenerateButton.tsx:150` | Decide whether image generation is validated product scope. If yes, add a real entrypoint and working model picker; if no, remove/hide dead surface. |
| Concurrency | CONC-05 | Stuck-message recovery can mark messages error while leaving generation sessions active/running. | `packages/jobs/src/trigger/recover-stuck-messages.ts:27`, `packages/jobs/src/trigger/recover-stuck-messages.ts:48`, `apps/web/src/lib/generation-v2/service.ts:393` | Recover sessions across `pending`, `running`, and `cancelling`; refresh parent request status after session updates. |
| Concurrency | CONC-06 | Generic `useSSE` cleanup sets `isMountedRef` false and never resets it for endpoint changes. | `apps/web/src/hooks/useSSE.ts:69`, `apps/web/src/hooks/useSSE.ts:132`, `apps/web/src/hooks/useSSE.ts:264`, `apps/web/src/hooks/useSSE.ts:276` | Reset `isMountedRef.current = true` at effect start, or use an effect-local cancellation flag. |
| Concurrency | CONC-07 | SSE parser throws from callback path outside normal async generator control flow. | `packages/api-client/src/sse.ts:47`, `packages/api-client/src/sse.ts:69`, `packages/api-client/src/sse.ts:74` | Capture parser errors and throw from the read loop so all consumers handle stream failures consistently. |
| Code quality | CQ-02 | API envelope convention drifts on pre-SSE and not-found error paths. | `apps/web/src/app/api/v1/messages/stream/[conversationId]/route.ts:31`, `apps/web/src/app/api/v1/cli/messages/stream/[conversationId]/route.ts:30`, `apps/web/src/app/api/v1/conversations/[id]/active-generation/route.ts:25` | Use `formatErrorEntity`/`withErrorHandling` before SSE headers commit; keep post-commit stream errors inside SSE. |
| Code quality | CQ-03 | Prompt definitions are duplicated between app-local and shared packages. | `apps/web/src/lib/prompts/operational.ts:34`, `packages/shared/src/prompts/title-generation.ts:1`, `apps/web/src/lib/conversations/titleGeneration.ts:14`, `packages/jobs/src/trigger/generate-title.ts:12` | Move operational prompts to shared modules or import shared prompts consistently. Add prompt parity tests. |
| Code quality | CQ-05 | Export/import DTOs use broad `any` and weak runtime validation at a user-data boundary. | `apps/web/src/lib/export/json.ts:7`, `apps/web/src/lib/export/chatgpt.ts:23`, `apps/web/src/lib/import/parsers/json.ts:6`, `apps/web/src/lib/import/parsers/json.ts:22` | Define versioned Zod schemas and DTO types derived from them. Add current, legacy, malformed import fixtures. |
| Docs / outstanding | OW-003 | Model-management docs claim static model config is removed, but runtime still exports/falls back to static config. | `docs/models/phase-5-cleanup.md:10`, `docs/models/phase-8-autorouter-integration.md:596`, `packages/ai/src/models.ts:91`, `packages/ai/src/utils.ts:22` | Mark docs historical/incomplete or open a current model-config migration plan with acceptance checks. |
| Docs / outstanding | OW-004 | Phase G docs conflict with shipped code and each other. | `docs/implementation/phase-g-completion/README.md:1`, `docs/implementation/phase-g-completion/00-current-state.md:15`, `apps/web/src/app/api/v1/onboarding/route.ts:1` | Archive as historical or add warnings and a current source-of-truth index. |
| Docs / outstanding | OW-005 | TUI docs include TODO snippets, but no `apps/tui` implementation exists. | `docs/tui/phase-2a-convex-integration.md:361`, `docs/tui/phase-4a-conversation-management.md:490`, `docs/monorepo/README.md:200` | Convert to roadmap/spec-only docs or create a validated TUI backlog item. |

## P3 - Opportunistic / Decision Backlog

| category | source | issue | evidence | recommended action |
|---|---|---|---|---|
| Bugs / hardening | BV-07 | Security headers lack CSP and Permissions-Policy. | `apps/web/vercel.json:15`, `apps/web/vercel.json:19`, `apps/web/src/components/chat/CodeBlock.tsx:114`, `apps/web/src/components/chat/MermaidRenderer.tsx:341` | Add report-only CSP first, then tighten incrementally. Add minimal Permissions-Policy. |
| Bugs / release | BV-08 | Release auto-merge workflow trusts branch/label without checking bot identity/head repo. | `.github/workflows/release-please-auto-merge.yml:4`, `.github/workflows/release-please-auto-merge.yml:38`, `.github/workflows/release-please-auto-merge.yml:69` | Require release-please author/app identity and head repo ownership before privileged approve/merge. |
| Half-finished | HF-007 | Canvas fuzzy conflict recovery is stubbed and appears unused by current document API path. | `packages/shared/src/canvas/diff.ts:381`, `packages/shared/src/canvas/diff.ts:496`, `apps/web/src/lib/api/dal/canvas.ts:28` | Finish and wire conflict recovery only if AI document edits need it; otherwise remove/de-scope the unused path. |
| Concurrency | CONC-08 | Embedding jobs can write stale embeddings after source content changes. | `packages/jobs/src/trigger/embed-note.ts:43`, `packages/jobs/src/trigger/embed-note.ts:65`, `packages/jobs/src/trigger/embed-task.ts:43`, `packages/jobs/src/trigger/embed-message.ts:46` | Capture source version/`updatedAt` and guard writes against changed content. |
| Code quality | CQ-06 | `generation-v2/repository.ts` is a large mixed-responsibility persistence module. | `apps/web/src/lib/generation-v2/repository.ts:1`, `apps/web/src/lib/generation-v2/repository.ts:523`, `apps/web/src/lib/generation-v2/repository.ts:1811` | Do not big-bang refactor. Extract stable sub-repositories only when touching related behavior, after characterization tests. |
| Code quality | CQ-07 | Bible reference conversion mixes parser-library output with custom regex/book maps in multiple places. | `apps/web/src/lib/bible/parser.ts:1`, `apps/web/src/lib/bible/utils.ts:60`, `apps/web/src/app/api/v1/bible/verse/route.ts:103` | Centralize OSIS display/query conversion in one tested module. |
| Code quality | CQ-08 | Operational DAL/jobs still use `console.*` where structured logging exists. | `apps/web/src/lib/logger.ts:1`, `apps/web/src/lib/api/dal/summarize.ts:58`, `packages/jobs/src/trigger/generate-title.ts:156`, `packages/jobs/src/trigger/generate-image.ts:246` | Replace `console.*` in touched operational paths with structured logger calls carrying non-sensitive ids and model/feature context. |
| Product / tasks | OW-006 | Task ordering is planned in schema/docs but not wired through DAL/UI. | `docs/features/smart-manager.md:164`, `packages/persistence-postgres/src/schema.ts:925`, `apps/web/src/lib/api/dal/tasks.ts:25`, `apps/web/src/components/tasks/TasksWorkspace.tsx:178` | Validate whether manual task ordering matters. If yes, add reorder API/UI; if no, remove/defer docs claims. |
| Product / canvas | OW-007 | Canvas docs list many future enhancements not implemented. | `docs/features/canvas.md:380` | File discrete product issues only for validated needs; otherwise keep as future ideas, not promised scope. |
| Product / search | OW-008 | Search/research docs list Google Grounding, personalized ranking, and analytics as unimplemented ideas. | `docs/research/google-grounding-gemini.md:5`, `docs/tool-optimisation.md:208` | Keep as research backlog or explicitly close if product direction is Tavily/Composio only. |
| Public docs | OW-009 | README/community/security docs include "coming soon" or planned promises without obvious implementation. | `README.md:34`, `README.md:131`, `CONTRIBUTING.md:427`, `SECURITY.md:295` | Link to live artifacts or reword as roadmap/non-committal future intent. |

## Product Discipline Notes

- BYOD, built-in tools, image generation, task ordering, TUI, canvas enhancements, and search improvements are not automatically "fix by building." Decide whether each solves a validated product problem. If not, hide/remove/defer the surface instead of expanding it.
- Sharing, generation reliability, cost tracking, and webhook/upload/code-exec hardening are existing broken or risky workflows. They should take priority over new features.
- For every implementation PR, keep the blast radius narrow and add characterization/regression tests around the exact failure mode.

## Verification Baseline

The audit workers created report-only commits. No full build/lint/test suite was run because no source code changed. Before implementing fixes, use repo gates:

- `bun run lint`
- `bun run build`
- targeted `bun run test:run` or package tests for the changed area
- migration generation only when schema changes require it
