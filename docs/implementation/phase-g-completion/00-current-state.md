# 00 — Current State Snapshot

Captured 2026-05-04 against `main` at `ac7d0b9c` (after `git pull --rebase`).

## Branch landscape

| Branch | Ahead of main | Status |
|---|---|---|
| `main` | — | Half-shipped: Convex deleted, Postgres routes partial, ~69 TODOs |
| `codex/postgres-rewrite` | +288 | Mostly already cherry-picked. 2 stale stashes reference deleted `packages/backend/convex/*`. **Drop after Phase G complete.** |
| `fix/postgres-env-bootstrap` | +27 | Pre-Phase G hardening. Already merged via squashes. **Delete after sync.** |
| `fix/admin-users-postgres` | 0 | Merged. **Delete.** |
| `fix/react-doctor-cleanup` | (parallel) | Unrelated React hygiene work. Separate. |

## TODO inventory (69 total, by file)

```
apps/web/src/app/(main)/admin/auto-router/page.tsx                         1
apps/web/src/app/(main)/admin/byod/page.tsx                                1
apps/web/src/app/(main)/admin/models/[id]/page.tsx                         7
apps/web/src/app/(main)/admin/models/page.tsx                              4
apps/web/src/app/(main)/admin/usage/page.tsx                               1
apps/web/src/app/(main)/admin/users/[userId]/page.tsx                      7
apps/web/src/app/(main)/admin/users/page.tsx                               4
apps/web/src/app/(main)/assistant/SmartAssistantPageClient.tsx             2
apps/web/src/app/(main)/settings/import/page.tsx                           1
apps/web/src/app/(main)/usage/UsagePageClient.tsx                          1
apps/web/src/app/api/v1/bible/verse/route.ts                               1
apps/web/src/app/cli-login/CLILoginPageClient.tsx                          1
apps/web/src/app/share/[shareId]/SharePageClient.tsx                       4
apps/web/src/components/assistant/MeetingReviewPanel.tsx                   1
apps/web/src/components/canvas/CanvasEditor.tsx                            1
apps/web/src/components/canvas/CanvasPanel.tsx                             2
apps/web/src/components/canvas/CanvasToolbar.tsx                           1
apps/web/src/components/chat/ModelPreviewModal.tsx                         1
apps/web/src/components/chat/QuickModelSwitcher.tsx                        1
apps/web/src/components/chat/ShareDialog.tsx                               4
apps/web/src/components/notifications/NotificationBell.tsx                 4
apps/web/src/components/onboarding/AutoRouterPreferenceModal.tsx           2
apps/web/src/components/onboarding/OnboardingTour.tsx                      3
apps/web/src/components/settings/UISettings.tsx                            1
apps/web/src/components/settings/admin/AdminLimitsSettings.tsx             1
apps/web/src/components/settings/admin/AdminMemorySettings.tsx             1
apps/web/src/components/settings/admin/AdminSearchSettings.tsx             1
apps/web/src/components/settings/admin/AdminTranscriptProviderSettings.tsx 1
apps/web/src/components/settings/admin/FeaturesSettings.tsx                1
apps/web/src/components/ui/minimal-tag-input.tsx                           1
apps/web/src/hooks/useCanvasHistory.ts                                     2
apps/web/src/lib/models/repository.ts                                      5
```

## Route inventory (`apps/web/src/app/api/v1`)

122 `route.ts` files exist. Key existing routes:

- `admin/users` GET — list ✅
- `admin/users/[id]` GET/PATCH ✅
- `admin/users/[id]/usage-summary|daily-spend|spend-by-model|cost-by-type|cost-by-feature|activity-stats|role|tier` ✅ (all 8)
- `admin/usage-summary` ✅
- `admin/feedback` and sub-routes ✅
- `cli/api-keys` POST ✅ (returns `{ key, keyPrefix, email, name }` — used by CLI login)
- `shares` POST ✅, `shares/[id]` PATCH ✅ (`{ isActive }` toggles, `{ expiresAt }` extends), `shares/by-conversation` ✅
- `preferences` GET/PATCH ✅
- `tasks` and `tasks/[id]` ✅
- `notes` and `notes/[id]` ✅, `notes/[id]/auto-tag` ✅, `notes/[id]/share` ✅
- `bookmarks/[id]/tags` POST/DELETE ✅ — pattern to copy for notes-tags
- `projects` and sub-routes ✅
- `comparisons` ✅
- `conversations/...` ✅
- `messages/...` ✅
- `memories/...` ✅
- `health` ✅

## Schema inventory (`packages/persistence-postgres/src/schema.ts`)

45 tables exist. Relevant for Phase G:
- `users`, `userPreferences`, `userAdminSettings`, `userApiKeys`, `cliApiKeys`
- `conversations`, `messages`, `attachments`, `messageEdges`, `messageToolCalls`, `messageSources`, `sourceMetadata`
- `notes`, `tasks`, `bookmarks`, `projects`, `templates`, `conversationShares`
- `memoryEmbeddings`, `messageEmbeddings`, `noteEmbeddings`, `taskEmbeddings`
- `usageRecords`, `ttsCache`
- `feedbackEntries`, `starterSuggestionCaches`
- `routingPolicies`, `routingDecisions`, `routingCandidateScores`, `routingOutcomes`, `routingFeedback`, `providerHealthSnapshots`, `routingExamples`
- `byodNeonConfigs`, `byodMigrationLogs`, `composioConnections`, `conversationIntegrationEvents`
- `generationRequests`, `generationSessions`, `generationCheckpoints`, `generationRequestIntegrations`
- `consolidations`, `comparisonVotes`
- `fileChunks`, `knowledgeSources`, `knowledgeChunks`

**Missing tables (Cat C):**
- `canvasDocuments`, `canvasHistory` — referenced in `packages/shared/src/byod/tables.ts` BYOD allowlist
- `notifications` — referenced in BYOD allowlist
- `userOnboarding` — onboarding tour completion
- `adminSettings` — global tunables (limits, features, search, memory, transcript)
- `autoRouterConfig` — singleton router tunables
- `modelOverrides` — admin overrides on top of static `MODEL_CONFIG`

## DAL inventory (`apps/web/src/lib/api/dal`)

Existing DAL files:
- `adminUsers.ts` (with `.shared.ts` schemas) — has `getUsageSummary`, `getDailySpend`, `getSpendByModel`, `getCostByType`, `getCostByFeature`, `getActivityStats` etc, all keyed by **target user id**. Reusable for `/usage/*` (user's own data).
- `bookmarks.ts`, `notes.ts`, `tasks.ts`, `projects.ts`, `templates.ts`, `memories.ts`, `cliApiKeys.ts`, `cliChat.ts`
- `conversations.ts`, `messages.ts`, `comparisons.ts`, `shares.ts`, `feedback.ts`, `starterSuggestions.ts`
- `byok.ts`, `byod.ts`, `composio.ts`
- `knowledge.ts`, `sources.ts`, `files.ts`
- `userData.ts`, `users.ts`, `preferences.ts`, `jobs.ts`, `sidebarAnalytics.ts`

**Missing DALs (Cat C):**
- `canvas.ts`
- `notifications.ts`
- `onboarding.ts`
- `adminSettings.ts`
- `adminModels.ts`
- `autoRouter.ts`
- `userAnalytics.ts` (extracted from `adminUsers.ts` for `/usage/*` consumer)
- `adminUsageAggregate.ts` (aggregated, all-users variant for `/admin/usage/*`)
- `import.ts` (for `/api/v1/import/conversations` POST)

## Persistence layer (`apps/web/src/lib/persistence`)

Existing: 26 files. Pattern: thin functions over `getPersistenceDb()` returning rows. Each new table gets a corresponding persistence file in PR 2/3.

## Test surface

Existing route tests live next to routes (`apps/web/src/app/api/v1/__tests__`). DAL tests under `apps/web/src/lib/api/dal/__tests__/`. Pattern: vitest + Clerk mock + PGlite test database.
