# 16: Smart Assistant removal

Remove the meeting/transcript workspace completely, including directly callable extraction actions. BK approved this retirement, D-003. The data/compatibility mechanism below is proposed under D-032; Q4/Q20 and S14/S17 gate migration and validator contraction. Nothing here authorizes deleting user-created tasks, notes, spend or audio.

### Delivery sequence

Implementation is split into [rung 2a and rung 2](20-roadmap.md#rung-2a-remove-smart-assistant-entrypoints-and-executable-source) before retained-data completion 2b. Rung 2a removes the route, controls, extraction implementations and feature-only prompts/models/exports, preserving the shared deadline prompt and old data readers. It also deploys additive `model_recommendations` schema/readers before any new writer uses that value. Rung 2 then switches future recommendation/triage/preview usage only, as explicitly approved in D-037. These are implementation boundaries, not claims that the candidate has deployed.

Historical task sources, usage categories and stored retired preference rows remain unchanged until the separately authorized reconciliation and supported-client barrier. Retaining those records is not a permanent hidden feature. The old recommendation-writer marker is a short-lived sequencing exception until rung 2, not a completed purge.

The exact reviewed flow at `04866f80a6236716ebf8d8c5a79001727f85f4bf` is sidebar → `/assistant` → upload/transcription or pasted transcript → `ai.meetingExtraction.extractFromMeeting` → `MeetingReviewPanel` → client-managed task/note creation. Drafts are React state, not durable meeting jobs. Tasks receive `sourceType: "smart_assistant"`; notes do not receive a recoverable feature marker. The [removal inventory](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md#exact-smart-assistant-removal-map) is the source map for this chapter.

## Exact code and contract map

All paths below are relative to the repository root. Remove only the feature-specific entries, not the containing shared modules.

| Path | Exact removal/change | What must survive |
|---|---|---|
| `apps/web/src/app/(main)/assistant/page.tsx` | Delete route implementation and its upload/extract/save flow | Generic not-found routing; no permanently hidden replacement workspace |
| `apps/web/src/components/sidebar/app-sidebar.tsx` | Remove `/assistant` destination, Smart Assistant visibility/preference branches | Other navigation and task/project destinations |
| `apps/web/src/components/assistant/MeetingReviewPanel.tsx`, `apps/web/src/components/assistant/TaskReviewPanel.tsx` | Delete both feature panels; second is legacy but still removal scope | Shared task/note editors elsewhere |
| `apps/web/src/components/settings/sections/SmartAssistantSection.tsx` | Delete feature-only section | Shared settings primitives |
| `apps/web/src/components/settings/UISettings.tsx` | Remove section import, accordion name, setting-to-section mapping, props/handlers | Other sections and their state |
| `apps/web/src/components/settings/sections/SidebarFeaturesSection.tsx` | Remove Smart Assistant toggle | `showTasks` and unrelated switches |
| `apps/web/src/hooks/useUISettingsState.ts` | Remove three feature preference subscriptions/states/effects/handlers/returned fields and `show_smart_assistant` analytics | `useUserPreference` and generic boolean handler |
| `packages/shared/src/preferences.ts` | Remove `showSmartAssistant`, `noteCategoryMode`, `customNoteCategories` defaults/types/level metadata | Task, memory, voice, recommendations and other preferences |
| `packages/backend/convex/users.ts`, `packages/backend/convex/users/preferences.ts` | Remove those three argument validators/validation branches after stale writers are blocked; remove stored rows in backfill | Authenticated generic preference CRUD with retired-key rejection |
| `packages/backend/convex/lib/helpers.ts::getFeatureToggles`, `packages/backend/convex/tools/search/searchAll.ts` | Remove `showSmartAssistant` return value/result type | Task search and `showTasks`; do not drop searchAll |
| `packages/backend/convex/ai/meetingExtraction.ts` | Delete public `extractFromMeeting` and feature-only helpers | Shared transcription; endpoint removal must make old direct calls impossible |
| `packages/backend/convex/ai/taskExtraction.ts` | Delete legacy public `extractTasksFromTranscript` and feature-only helpers | Task-manager natural-language deadline parsing |
| `packages/ai/src/prompts/meetingExtraction.ts`, `apps/web/src/lib/prompts/meetingExtraction.ts` | Delete `MEETING_EXTRACTION_PROMPT` and forwarding module | Other prompt families |
| `packages/ai/src/prompts/taskExtraction.ts`, `apps/web/src/lib/prompts/taskExtraction.ts` | Move `DEADLINE_PARSING_PROMPT` to a task/deadline-specific dedicated module first; delete `TASK_EXTRACTION_PROMPT` and old forwarding/subpath after consumer migration | Centralized deadline prompt and its parity/export contract |
| `packages/backend/convex/tools/taskManager.ts` | Update deadline prompt import to the new dedicated module | Task creation/deadlines; no extraction endpoint dependency |
| `packages/ai/src/operational-models.ts` | Remove `TASK_EXTRACTION_MODEL`, `MEETING_EXTRACTION_MODEL` and the `taskExtraction`, `meetingExtraction` members of both `OperationalModels` and `OPERATIONAL_MODELS` | `DEADLINE_PARSING_MODEL`, document extraction, feedback/model triage, memory; do not delete catalog models shared by other jobs |
| `packages/ai/package.json` | Remove `./prompts/meetingExtraction`, `./prompts/taskExtraction` subpath exports and matching tsup entrypoints after moving deadline export | New deadline export/build input; other public package exports |
| `apps/web/src/lib/prompts/__tests__/parity.test.ts` | Remove meeting/task extraction imports/assertions; update deadline import | Deadline, `MODEL_TRIAGE_PROMPT` and `TRIAGE_PROMPT` parity assertions |
| `packages/backend/convex/_generated/api.d.ts` | Regenerate after action deletion; no phantom imports/API names | Normal generated bindings; never hand-maintain obsolete entries |
| `packages/backend/convex/schema.ts`, `packages/backend/convex/schema/tasks.ts`, `packages/backend/convex/tasks.ts` | Backfill then remove `smart_assistant` task source literal from both schemas and both create validators | Task IDs, source fields, content, status, deadlines, tags/junctions, embeddings, projects |
| `packages/backend/convex/schema.ts`, `packages/backend/convex/schema/usage.ts`, `packages/backend/convex/usage/mutations.ts` | Backfill then remove `smart_assistant` usage literal/validator | Historical cost/token/message/payer/date totals |
| `packages/backend/convex/usage/queries.ts` | Remove feature union member and all three empty-breakdown constructors | Historical-neutral category projection and all accounting totals |
| `packages/backend/convex/ai/modelTriage.ts` | Relabel future analysis/preview calls before removing old usage literal; remove misleading comments | Cheaper-model recommendation/preview and its server opt-out/accounting repair, [06](06-model-routing.md) |
| `apps/web/src/app/(main)/usage/page.tsx`, `apps/web/src/app/(main)/admin/usage/page.tsx`, `apps/web/src/app/(main)/admin/users/[userId]/page.tsx` | Remove retired feature labels/colors and add approved historical projection | User/admin spend visibility, including retained ambiguous history |
| `packages/byod-schema/convex/bundled-schema.ts`, `packages/byod-schema/schema-string.ts`; `scripts/sync-byod-schema.ts` workflow | Regenerate from updated modular schemas; coordinate BYOD schema version | Supported customer-owned data, version negotiation/migrations |
| `docs/features/smart-manager.md` | Remove Smart Assistant instructions, file map, testing checklist and promises | Rewrite/retain independent projects and file-RAG sections |
| Current guides/export indexes/build outputs | Remove active feature pointers/re-exports/types and feature-only generated dist/maps during authorized package rebuild | Historical changelog/research/migration evidence and unrelated user files |

The operational-model entries above are the feature's model capabilities/configuration to retire. They reference models used elsewhere; removal is not permission to delete those model IDs, `function-calling`, general extraction, transcription or chat `role: "assistant"`. Inspect the final candidate's types and exports for transitive residue, not just the visible section name. The [operational-model source](../../packages/ai/src/operational-models.ts#L88-L107) distinguishes extraction from shared deadlines.

Do not delete `packages/assistant-tools-core` because of its name. It is an empty package entrypoint, not this feature. Preserve web `VoiceInput`, mobile `useChatSTT`, `transcription.transcribeAudio`, TTS, tasks/notes/projects/RAG, memory/incognito, document/canvas tools, model recommendations and ordinary assistant messages. No other feature removal was approved. (D-003; [disposition evidence](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md#3-what-should-be-kept-integrated-removed-tested-or-deferred))

## Migration order

### Stop writers before touching retained values

Inventory hosted deployments, supported BYOD schema/client versions, external/published prompt consumers, old web/mobile clients, pending/running extraction actions and import/restore writers. Snapshot restricted before-counts, IDs and accounting sums. A migration manifest records old/new values and batch cursors, not transcript content, access tokens or credentials in logs.

Remove route/nav/settings producers and block both direct extraction actions before any backfill. A temporary fail-closed action tombstone may return retirement without a provider call during the compatibility window; it needs a dated deletion condition. The final state deletes the actions, not a permanent flag. Stop/quiesce only extraction jobs. There is no feature-specific cron in reviewed `crons.ts`; preserve all unrelated crons. Inspect deployed scheduled functions and stored notifications for old action references or `/assistant` links. Static absence cannot prove old stored work is gone. (S14/S17)

First move deadline imports/exports and teach usage readers/validators the approved replacement classifications. Then switch recommendation writers. Generic preference setters, restores and old clients must not recreate retired keys. Observe zero new old-marker writes before backfilling; a button disappearing is not proof a public action or cached client stopped.

### Backfill in bounded, audited, idempotent batches

Use authenticated/admin-scoped internal migration mutations with pagination, checkpoints, retry-safe mappings and a dry-run/report mode. Keep old validators temporarily permissive so a partial batch does not strand retained data. Q20 must approve exact mappings before mutation; the following are proposals, not new canonical classifications.

| Existing data | Proposed mapping and invariant |
|---|---|
| Tasks with `sourceType: "smart_assistant"` | Use existing `sourceType: "transcript"`. Retain `_id`, owner, sourceId/sourceContext, content, deadline/status, tags, embeddings and all project relationships. Original classification stays in the restricted migration manifest |
| Notes created by the page | Keep every note. No feature marker was stored; do not guess from title/text/date or assign fabricated source provenance |
| Historical `usageRecords.feature` | Preserve cost, tokens, message counts, model, dates, conversation and `isByok` fields. Use an approved neutral historical classification or generic accounting archive when original purpose cannot be proven. `legacy_assistive` is an example awaiting Q20, not an approved enum |
| Future model-triage/preview usage | D-037 approves `model_recommendations` for future calls after deployed readers/validators accept it. New feature buckets must not merge into old same-user/date/model rows. This is not a mapping of any historical row to recommendations |
| `userPreferences` | Delete only `showSmartAssistant`, `noteCategoryMode`, `customNoteCategories`, including legacy/imported representations. Removing defaults alone leaves stored overrides visible |
| Audio/storage | Retain by default. Delete only proven feature-owned, unreferenced blobs under approved Q4 retention after reference/ownership audit. A missing files row is insufficient because the page used raw upload URLs without a durable meeting owner |

Daily aggregates already lose feature/conversation/payer dimensions, [DS-11](../../research_notes/blah-chat-modernization-review/data-security.md#ds-11--medium-daily-usage-upsert-loses-conversation-feature-and-payer-dimensions). Do not reconstruct missing provenance from confidence or current writer names. Preserve totals and disclose historical attribution limits in usage views. Coordinate with [14](14-cost-model.md), not a second accounting migration.

Reconcile before/after task/note counts, record IDs, source values, junction integrity and token/cost/message sums using every dimension the records actually retain. Record unknown dimensions as unknown. Resume after an interrupted batch, run twice and prove the second run changes zero records. Retain restricted rollback manifests and prove older backup import/preflight cannot re-enable retired writers. Do not replay extraction/provider calls to reconstruct history. (D-032; S14/S17)

### Enforce the old-client barrier, then contract

The source writers can stop early; strict schema removal must wait until every supported hosted/BYOD database has migrated and old clients/import paths cannot submit retired keys/source values. Q20/Q22 set the window/minimum versions. Old clients receive a clear update/retirement error before spend, never a silently accepted dead preference. During overlap, new readers understand both retained formats; new writers emit only the approved format.

After reconciliation and the barrier, remove feature actions/components/prompts/models/types/exports and old task/usage/preference validators. Regenerate Convex API plus BYOD bundled schema/string with the existing schema-sync workflow, version the customer schema, and validate against authorized staged/deployed migrated data. Local TypeScript alone cannot establish Convex schema compatibility. Published consumers must be migrated/versioned before subpath removal. Rebuild only touched known package outputs, including declaration/source maps; do not sweep experiments or unrelated dist directories.

Remove temporary ingestion adapters/tombstones when the window closes. Keep narrowly versioned migration fixtures/manifests as history, not runtime feature code. Update active docs and restore instructions; preserve `CHANGELOG.md`, pinned research and Git history. There must be no permanent Smart Assistant flag, dead prompt or hidden replacement page. (D-003/D-032)

## Acceptance evidence

This proposed tracked-file command is a review gate for the eventual retirement PR, not a command executed by this planning task. Run from root. It excludes history and planning evidence explicitly and does not scan user experiments. Add only individually reviewed versioned migration fixtures to the allowlist; never exclude all tests/migrations to get green.

```sh
git grep -n -I -E 'SmartAssistant|Smart Assistant|showSmartAssistant|smart_assistant|smart-assistant|show_smart_assistant|noteCategoryMode|customNoteCategories|MeetingReviewPanel|TaskReviewPanel|MEETING_EXTRACTION|TASK_EXTRACTION|meetingExtraction|taskExtraction|extractFromMeeting|extractTasksFromTranscript|/assistant' -- apps packages scripts docs AGENTS.md README.md CONTRIBUTING.md SELF_HOSTING.md ':!docs/blueprint/**' ':!docs/research/**' ':!docs/history/**' ':!**/CHANGELOG.md'
```

Classify every match. No matches is grep exit 1, matches exit 0, execution error exit greater than 1; a wrapper must distinguish them rather than swallow the status. Names in an immutable migration fixture need an explicit path/reason. Inspect active content in excluded historical directories if it still instructs current users. Run a separate review of built package exports/maps and deployed public function inventory because tracked grep cannot see published artifacts or installed stale dist. A broad zero-match rule for `assistant` is invalid.

Completion requires all of the following, S14/S17, with scoped quality gates in [15](15-observability-and-evals.md):

- No active route/nav/settings/preference/search/type/import/prompt/model-config/cost-label/export/generated-API reference implements the retired feature. Direct stale action calls cannot call a provider; final deployed functions are absent.
- Zero old task sources, usage categories and three preference keys in each supported migrated deployment. Pending extraction functions and old notification links have an audited disposition. Older restores pass preflight/migration rather than revive the feature.
- IDs, task/note counts, links and historical financial totals reconcile; resumed and second-pass batches preserve them. No guessed note/audio deletion.
- Actual retained flows pass: web/mobile voice input and authenticated transcription; task-manager relative deadlines with the moved prompt; task/note CRUD/search and project links; manual selection, Auto retry exhaustion; recommendation/preview and server opt-out; incognito/memory and document tools. Keep legitimate prompt parity assertions. Endpoint mocks alone do not prove these journeys survived.
- Quiet workbench, Q2, has no dead destination or confusing retired-feature empty panel. Existing work remains where users expect it; failed stale-client attempts explain the update path without offering meeting extraction under a new name.
