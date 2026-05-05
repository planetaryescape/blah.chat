# 03 — Cat B: Route Builds (existing tables)

Routes that don't exist but the underlying data already lives in Postgres. Each item below specifies the route, request shape, response shape, DAL extension, and test.

**Estimated effort:** ~1 day across PR 4. Some refactors share work.

**Acceptance:** every page that referenced a missing route now renders real data. No TODO references missing routes.

---

## B1 — `/api/v1/import/conversations` (POST)

**Page:** `apps/web/src/app/(main)/settings/import/page.tsx`

**Client payload:**

```ts
{
  conversations: Array<{
    title: string;
    model?: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
      createdAt?: number;
    }>;
  }>
}
```

**Response (envelope):**

```ts
formatEntity({
  success: boolean,
  importedCount: number,
  conversationIds: string[],
  errors?: Array<{ index: number; reason: string }>,
}, "import_result");
```

**File:** `apps/web/src/app/api/v1/import/conversations/route.ts`

**Handler:**

- `withErrorHandling(withUserAuth(...))` wrapper
- Parse with `zod` schema (max 1000 conversations per call, max 5000 messages per conversation)
- For each conversation, in a single transaction per conversation:
  - Insert into `conversations` (set `userId`, `title`, `model`, `createdAt = first msg.createdAt ?? now()`)
  - Insert messages in order; respect createdAt; chain via `messageEdges` (parent = previous message)
  - Insert default assistant model = body's `model` or `currentUser.preferences.defaultModel`
- Per-conversation try/catch; collect errors instead of failing the whole batch
- Log progress at 100-message intervals (pino)
- Return `formatEntity(result, "import_result")`

**DAL:** new `apps/web/src/lib/api/dal/import.ts` exposes `importDAL.importConversations(userId, payload)`. Persistence helper in `apps/web/src/lib/persistence/import.ts`.

**Test:** `apps/web/src/app/api/v1/__tests__/import.test.ts` covering blah.chat JSON shape, ChatGPT shape (post-parse), markdown shape (post-parse), partial failure handling.

**Acceptance:** Import 50-message JSON; appears in sidebar; navigating opens correctly; no orphan messages.

---

## B2 — `/api/v1/admin/byod/{stats,instances,health-check,run-migrations,send-notifications}`

**Page:** `apps/web/src/app/(main)/admin/byod/page.tsx`

5 routes, all admin-only (`requireCurrentAdmin(userId)`).

### B2a — `GET /api/v1/admin/byod/stats`

**Response:**

```ts
formatEntity({
  totalInstances: number,
  activeInstances: number,
  failedHealthChecks: number,
  pendingMigrations: number,
  byTier: Record<string, number>,
  byProvider: Record<string, number>,    // currently only "neon"
}, "admin_byod_stats");
```

**DAL:** extend `apps/web/src/lib/api/dal/byod.ts` with `byodDAL.getAdminStats()` aggregating from `byodNeonConfigs` + `byodMigrationLogs`.

### B2b — `GET /api/v1/admin/byod/instances?cursor=&limit=&status=`

**Response:** `formatEntityList(instances, "byod_instance")` with each row joining `byodNeonConfigs` + last `byodMigrationLogs` entry + last health check.

### B2c — `POST /api/v1/admin/byod/health-check`

Body: `{ configId?: string }` — if omitted, checks all active instances.

Implementation: dispatch a Trigger.dev job (`packages/jobs/src/trigger/byod-health-check.ts`). Returns `{ jobId }`.

### B2d — `POST /api/v1/admin/byod/run-migrations`

Body: `{ configId?: string }`. Same pattern as health-check — dispatch job, return `{ jobId }`. Job logs into `byodMigrationLogs`.

### B2e — `POST /api/v1/admin/byod/send-notifications`

Body: `{ configIds: string[]; type: "health_alert" | "migration_complete"; message?: string }`. Inserts rows into `notifications` for each owner of the configs (depends on PR 3 notifications table).

**Order:** B2e blocks on PR 3 (notifications table). B2a-d can ship in PR 4.

**Tests:** `apps/web/src/app/api/v1/__tests__/admin-byod.test.ts` with admin + non-admin auth coverage.

---

## B3 — `/api/v1/admin/auto-router/config` (GET, PATCH)

**Page:** `apps/web/src/app/(main)/admin/auto-router/page.tsx`

**Backed by:** `autoRouterConfig` singleton table (PR 3).

**File:** `apps/web/src/app/api/v1/admin/auto-router/config/route.ts`

**GET response:** `formatEntity(value, "auto_router_config", "global")` where `value` is `AutoRouterConfigValue`. On first read, seed from `defaultAutoRouterConfig` and insert.

**PATCH body:** partial `AutoRouterConfigValue`. Validate with zod, deep-merge with current value, persist, log into `modelChangeLog`? (No — auto-router config has its own log if needed; for now skip.)

**DAL:** new `apps/web/src/lib/api/dal/autoRouter.ts` and persistence helper.

---

## B4 — `/api/v1/admin/usage/*` and `/api/v1/admin/user-count`

**Page:** `apps/web/src/app/(main)/admin/usage/page.tsx`

6 routes:

| Route | Aggregated from |
|---|---|
| `GET /api/v1/admin/usage/monthly-total` | `usageRecords` SUM(cost) where current calendar month |
| `GET /api/v1/admin/usage/daily-spend?days=30` | `usageRecords` group by day |
| `GET /api/v1/admin/usage/spend-by-model?days=30` | `usageRecords` group by `modelId` |
| `GET /api/v1/admin/usage/conversation-costs?limit=10` | `usageRecords` group by `conversationId` ordered by SUM(cost) DESC |
| `GET /api/v1/admin/usage/cost-by-feature?startDate=&endDate=` | `usageRecords` group by `feature` (column already exists) |
| `GET /api/v1/admin/user-count` | `users` count |

All admin-only.

**Refactor:** extract reusable aggregate helpers into a new `apps/web/src/lib/persistence/usageAggregates.ts` exposing `getMonthlyTotal()`, `getDailySpend({ userId?, days })`, `getSpendByModel({ userId?, days })`, `getCostByFeature({ userId?, startDate, endDate })`, `getConversationCosts({ userId?, limit })`. **Both** the existing `/api/v1/admin/users/[id]/*` and the new admin/user routes call into the same helpers — just different optional `userId` filter.

**DAL:** new `apps/web/src/lib/api/dal/adminUsageAggregate.ts`.

**Tests:** `apps/web/src/app/api/v1/__tests__/admin-usage.test.ts` checks numbers match for two seeded users.

---

## B5 — `/api/v1/usage/*` (current user, 12 routes)

**Page:** `apps/web/src/app/(main)/usage/UsagePageClient.tsx`

| Route | Source |
|---|---|
| `GET /api/v1/usage/summary?startDate=&endDate=` | `usageAggregates.getUsageSummary({ userId })` |
| `GET /api/v1/usage/daily-spend?days=30` | `usageAggregates.getDailySpend({ userId, days })` |
| `GET /api/v1/usage/spend-by-model-detailed?startDate=&endDate=` | `usageAggregates.getSpendByModel({ userId, ... })` with detailed columns (input/output/cached) |
| `GET /api/v1/usage/cost-by-type?startDate=&endDate=` | text/voice/image breakdown |
| `GET /api/v1/usage/cost-by-feature?startDate=&endDate=` | by `feature` |
| `GET /api/v1/usage/activity-stats` | hours active, sessions, etc. |
| `GET /api/v1/usage/total-counts` | conversation + message + token totals |
| `GET /api/v1/usage/streaks` | day-streak from `usageRecords` |
| `GET /api/v1/usage/heatmap` | per-day count, last 365 days |
| `GET /api/v1/usage/percentile-ranking` | this user's rank vs population |
| `GET /api/v1/usage/action-stats` | per-action counts (if `usageRecords.feature` already records this) |
| `GET /api/v1/usage/byok-breakdown?startDate=&endDate=` | split usage by BYOK vs platform key |

All non-admin. `withUserAuth`.

**DAL:** new `apps/web/src/lib/api/dal/userAnalytics.ts`. Wraps `usageAggregates` helpers (B4 refactor) with current user's id.

**New helpers needed in `usageAggregates.ts`:**

- `getStreakStats(userId)` — longest streak, current streak
- `getHeatmap(userId, days)` — array of 365 entries
- `getPercentileRanking(userId)` — your messages/cost vs all users (precomputed daily? for now, run on demand with row-count cap)
- `getActionStats(userId, range)` — group by `feature`
- `getByokBreakdown(userId, range)` — needs `usageRecords.usedByokKey` (verify column exists; if not, ALTER + backfill)

**Tests:** `apps/web/src/app/api/v1/__tests__/usage.test.ts`.

---

## B6 — `POST /api/v1/actions/extract-meeting`

**Page:** `apps/web/src/app/(main)/assistant/SmartAssistantPageClient.tsx:60`

**Client payload:**

```ts
{
  text: string;                 // raw transcript or note text
  audioFileId?: string;         // if uploaded earlier
  conversationId?: string;
}
```

**Behavior:** stateless LLM action. Calls Anthropic via existing `@blah-chat/ai` SDK with the existing `meetingExtractionPrompt` (already in `packages/backend/convex/lib/prompts/` per migration history — verify location post-migration; if missing, port from git history).

**Response:**

```ts
formatEntity({
  attendees: string[],
  decisions: string[],
  actionItems: Array<{ title: string; ownerHint?: string; deadline?: number }>,
  notes: string,
  followUpEmailDraft?: string,
  taskIds: string[],            // if auto-created via existing /tasks
}, "meeting_extraction");
```

**DAL:** new `apps/web/src/lib/api/dal/meetingExtraction.ts`. Streamed? No — atomic action.

**Implementation:**

- Read prompt from `apps/web/src/lib/prompts/meetingExtraction.ts` (port from packages/backend if needed; centralized per CLAUDE.md rule)
- Call LLM with `usageRecord.feature = "meeting_extraction"` for cost tracking
- Optionally call `tasksDAL.createBatch(...)` for auto-create
- Return result

**Tests:** mock LLM, verify response shape and `usageRecords` insert.

---

## B7 — `/api/v1/notes/[id]/tags` (POST, DELETE)

**Page:** `apps/web/src/components/ui/minimal-tag-input.tsx`

Mirror `apps/web/src/app/api/v1/bookmarks/[id]/tags/route.ts` exactly.

**File:** `apps/web/src/app/api/v1/notes/[id]/tags/route.ts`

**POST body:** `{ tag: string }` (or `{ tags: string[] }` for batch — check what the input component sends)
**DELETE:** querystring `?tag=encoded`

**DAL:** extend `notesDAL` with `addTag(userId, noteId, body)` and `removeTag(userId, noteId, tag)`. Use `array_append` and `array_remove` SQL.

**Tests:** `apps/web/src/app/api/v1/__tests__/notes-tags.test.ts`.

---

## B8 — `/api/v1/admin/settings` (GET, PATCH)

**Pages:** `AdminLimitsSettings`, `AdminSearchSettings`, `AdminMemorySettings`, `AdminTranscriptProviderSettings`, `FeaturesSettings`

**Backed by:** `adminSettings` singleton (PR 3 schema).

**File:** `apps/web/src/app/api/v1/admin/settings/route.ts`

**GET:** returns `formatEntity(value, "admin_settings", "global")`. Seeds with `defaultAdminSettings` on first read.

**PATCH:** body is partial `AdminSettingsValue`. Validate with zod, deep-merge, persist, set `updatedBy = userId`, `updatedAt = now()`. Return new value.

**DAL:** new `apps/web/src/lib/api/dal/adminSettings.ts`. Persistence in `apps/web/src/lib/persistence/adminSettings.ts`.

**Tests:** assert deep-merge preserves untouched fields.

**Caching:** the route is hot (every page that consumes admin settings reads it). Cache the singleton in-memory with 30s TTL on the server (`unstable_cache` or simple module-level Map). Invalidate on PATCH.

---

## B9 — `/api/v1/admin/models/*` (admin model management, 9 routes)

**Pages:** `apps/web/src/app/(main)/admin/models/page.tsx`, `apps/web/src/app/(main)/admin/models/[id]/page.tsx`

**Backed by:** static `MODEL_CONFIG` from `@blah-chat/ai/models` + `modelOverrides` + `modelChangeLog` (PR 3 schema).

**Source-of-truth merge:** at read, merge static `MODEL_CONFIG` with `modelOverrides` keyed by `modelId`. Custom models (where `isCustom = true`, `modelId` not in static config) layer on top.

**Routes:**

| Route | Behavior |
|---|---|
| `GET /api/v1/admin/models?status=&provider=&q=` | List merged models, paged |
| `POST /api/v1/admin/models` | Create custom model: insert with `isCustom = true`. Body validated against zod schema mirroring `ModelConfig`. Log in `modelChangeLog` with `changeType = "created"`. |
| `GET /api/v1/admin/models/[id]` | Single merged model (id is the `modelId` string, not row id) |
| `PATCH /api/v1/admin/models/[id]` | Upsert into `modelOverrides`. Compute diff vs effective value. Log in `modelChangeLog` with `changeType = "updated"`. |
| `DELETE /api/v1/admin/models/[id]` | If `isCustom`, soft-delete (set status="internal" or hard delete with cascade log). Static models can't be deleted; return 400. |
| `POST /api/v1/admin/models/[id]/deprecate` | Set `status = "deprecated"`, `deprecatedAt = now()`. Log. |
| `POST /api/v1/admin/models/[id]/reactivate` | Set `status = "active"`, `reactivatedAt = now()`. Log. |
| `POST /api/v1/admin/models/duplicate` | Body `{ sourceModelId, newModelId }`. Read effective config, create custom model. |
| `GET /api/v1/admin/models/[id]/history?limit=10` | Read from `modelChangeLog`. |

**DAL:** new `apps/web/src/lib/api/dal/adminModels.ts` exposing:

- `list({ status?, provider?, q?, cursor?, limit? })`
- `get(modelId)`
- `create(input, actorId)`
- `update(modelId, input, actorId)`
- `remove(modelId, actorId)`
- `deprecate(modelId, actorId)`
- `reactivate(modelId, actorId)`
- `duplicate(sourceModelId, newModelId, actorId)`
- `history(modelId, limit)`

**Persistence:** `apps/web/src/lib/persistence/modelOverrides.ts`, `modelChangeLog.ts`.

**Side effect:** `MODEL_CONFIG` consumers in chat (model picker, auto-router) MUST start using the merged view, not the static config. Add a `getEffectiveModels()` server-side helper. Wire `useModels()` hook to a new `/api/v1/models` GET route (paginated for clients) that returns the merged set.

**This unblocks `apps/web/src/lib/models/repository.ts`** TODOs:

- `useModelProfiles` — return `?` from `routingPolicies` (separate table, exists)
- `useRouterConfig` — call `/api/v1/admin/auto-router/config` (B3) — but only for admins; non-admin returns `undefined`
- `useModelHistory` — call `/api/v1/admin/models/[id]/history` (admin only)
- `useModelStats` — admin: aggregate from merged models
- `useAllModels` — admin: list including internal-only

**Tests:** `apps/web/src/app/api/v1/__tests__/admin-models.test.ts` covering the merge logic, deprecation flow, audit log presence.

---

## B10 — `/api/v1/conversations/[id]/model-preview` (POST)

**Page:** `apps/web/src/components/chat/ModelPreviewModal.tsx:56`

**Behavior:** generates a preview of how a different model would respond to the most recent user prompt in the conversation. Stateless LLM call.

**Body:**

```ts
{
  modelId: string;
  // optionally limit to last N messages
}
```

**Response:**

```ts
formatEntity({
  modelId: string,
  preview: string,
  estimatedCost: number,
  estimatedLatencyMs: number,
}, "model_preview");
```

**Implementation:**

- Load conversation messages (latest assistant turn replayed against new model)
- Run model with `streaming: false`, capture text + tokens + cost
- Insert `usageRecord` with `feature = "model_preview"`
- Return result

**DAL:** new `apps/web/src/lib/api/dal/modelPreview.ts`.

---

## B11 — `/api/v1/conversations/[id]/model-recommendation/dismiss` (POST)

**File:** `apps/web/src/components/chat/ModelPreviewModal.tsx:177`

`conversations` already has `modelRecommendation: ConversationModelRecommendation` JSON column with `dismissed: boolean` field. Route flips the flag.

**File:** `apps/web/src/app/api/v1/conversations/[id]/model-recommendation/dismiss/route.ts` (note: `model-recommendation` route already exists — verify whether `dismiss` sub-route exists. If yes, pure Cat A wire-up; if no, build).

---

## DAL refactor summary

After Cat B:

```
apps/web/src/lib/api/dal/
├── adminUsers.ts                  # (slimmed — analytics moved to userAnalytics)
├── adminUsersAnalytics.ts         # NEW — admin-targeted aggregates per user
├── adminUsageAggregate.ts         # NEW — global aggregates (all users)
├── userAnalytics.ts               # NEW — current user's usage
├── adminSettings.ts               # NEW
├── adminModels.ts                 # NEW
├── autoRouter.ts                  # NEW
├── meetingExtraction.ts           # NEW
├── modelPreview.ts                # NEW
├── import.ts                      # NEW
├── byod.ts                        # extended
├── notes.ts                       # extended (addTag/removeTag)
└── ...
```

`apps/web/src/lib/persistence/usageAggregates.ts` is the single SQL site for all spend/cost/streak/heatmap math.

## Cat B PR scope

**PR 4 (after PR 3 schema lands):**

- B1 — import (no schema dep)
- B4 — admin/usage aggregates
- B5 — /usage current user
- B7 — notes tags
- B8 — admin/settings (depends on PR 3 schema for `adminSettings` table)
- B9 — admin/models (depends on PR 3 schema for `modelOverrides`/`modelChangeLog`)
- B3 — admin/auto-router config (depends on PR 3 `autoRouterConfig`)
- B10/B11 — model-preview (no schema dep)
- B6 — meeting extraction (no schema dep)
- B2a-d — admin/byod read routes (no schema dep)
- B2e — admin/byod send-notifications (depends on PR 3 `notifications`)
