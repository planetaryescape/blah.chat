# 04 — Cat C: Feature Builds (new tables)

Features that have UI shipped but no Postgres home. **None of these are cut.** Each gets a full table, persistence, DAL, routes, hooks, and wire-up.

Schema in [01-schema-additions.md](./01-schema-additions.md). Routes for some surfaces overlap with [03-cat-b-routes.md](./03-cat-b-routes.md) (B3 admin/auto-router, B8 admin/settings, B9 admin/models) — those are cross-referenced.

---

## C1 — Canvas

The collaborative document editor. Already integrated into chat at `ChatConversationPageClient.tsx:737-744` and triggered when `conversation.mode === "document"`.

### Tables (PR 2)

`canvasDocuments`, `canvasHistory` — see [01-schema-additions.md](./01-schema-additions.md) §1, §2.

Plus `conversations.activeCanvasDocumentId` column.

### Persistence (PR 3)

**File:** `apps/web/src/lib/persistence/canvas.ts`

Functions:

```ts
listCanvasDocuments(userId: string, opts?: { conversationId?: string; cursor?: string; limit?: number })
getCanvasDocument(userId: string, documentId: string)
createCanvasDocument(userId: string, input: { conversationId: string; title: string; content?: string; metadata?: CanvasMetadata })
updateCanvasContent(userId: string, documentId: string, input: { content: string; source: CanvasHistorySource; messageId?: string; diff?: string; expectedVersion?: number })
updateCanvasMetadata(userId: string, documentId: string, metadata: Partial<CanvasMetadata>)
renameCanvasDocument(userId: string, documentId: string, title: string)
archiveCanvasDocument(userId: string, documentId: string)
listCanvasHistory(userId: string, documentId: string, opts?: { limit?: number; cursor?: string })
restoreCanvasFromHistory(userId: string, documentId: string, historyId: string)
setActiveCanvasDocument(userId: string, conversationId: string, documentId: string | null)
```

**`updateCanvasContent` is the hot path:**

- Acquire row-level lock on `canvas_documents` (`SELECT FOR UPDATE` inside transaction).
- If `expectedVersion` provided and `current.contentVersion !== expectedVersion`: return `{ conflict: true, current }` instead of writing — front-end's `ConflictDialog` resolves.
- Else: increment `contentVersion`, write `content`, append `canvasHistory` row with new version.

### DAL (PR 3)

**File:** `apps/web/src/lib/api/dal/canvas.ts`

Wraps persistence with envelope formatting. All methods take `userId`.

### Routes (PR 3)

| Route | Method | Notes |
|---|---|---|
| `/api/v1/canvas/documents` | `GET`, `POST` | List/create |
| `/api/v1/canvas/documents/[id]` | `GET`, `PATCH`, `DELETE` | Read, update content+metadata, archive |
| `/api/v1/canvas/documents/[id]/history` | `GET` | List revisions |
| `/api/v1/canvas/documents/[id]/restore` | `POST` | Body: `{ historyId: string }` |
| `/api/v1/conversations/[id]/active-canvas` | `PATCH` | Body: `{ documentId: string \| null }` |

**Versioning details:**

- `PATCH /canvas/documents/[id]` body:

  ```ts
  {
    content?: string;
    expectedVersion?: number;        // for optimistic concurrency
    source: CanvasHistorySource;
    diff?: string;
    messageId?: string;
    metadata?: Partial<CanvasMetadata>;
    title?: string;
  }
  ```

- Response on conflict: HTTP 409 with `formatErrorEntity({ message: "Version conflict", currentVersion, currentContent }, ...)`.

### Wire-up (PR 5)

Replace stubs in:

- `apps/web/src/components/canvas/CanvasPanel.tsx:22-28` → `useCanvasDocument(documentId)` hook backed by `useQuery(['canvas-document', id])`. `updateContent` mutation calls `PATCH /canvas/documents/[id]`.
- `apps/web/src/components/canvas/CanvasEditor.tsx:39` → uses content from hook.
- `apps/web/src/components/canvas/CanvasToolbar.tsx:48` → exposes rename/archive mutations.
- `apps/web/src/hooks/useCanvasHistory.ts:7-10` → `useQuery(['canvas-history', id])` against `/canvas/documents/[id]/history`.
- `apps/web/src/hooks/useCanvasAutoSync.ts` line where `activeCanvasDocumentId: undefined` is hardcoded → fetch from `conversations.activeCanvasDocumentId` in `ChatConversationPageClient.tsx`.

### Realtime sync (Phase G+, optional but planned)

For multi-tab editing the conflict dialog handles divergence. For "AI is writing while user is too" we need a stream. **Not blocking for Phase G**; document as follow-up:

- Option: SSE endpoint `/api/v1/canvas/documents/[id]/stream` emitting version bumps.
- Option: client polls `contentVersion` every 3s when panel is open.

Pick polling for v1.

### Tests

- `apps/web/src/app/api/v1/__tests__/canvas.test.ts` — CRUD round-trip
- `apps/web/src/app/api/v1/__tests__/canvas-conflict.test.ts` — version conflict detection
- `apps/web/src/lib/persistence/__tests__/canvas.test.ts` — history append, restore semantics

### Acceptance

- Open conversation in document mode → canvas panel renders blank doc
- Edit content, close panel, reopen → content persists
- Edit in two tabs → second save returns 409, ConflictDialog shows, resolve "merge" persists merged content with new version
- Version history panel lists all edits with timestamps and source labels
- Restore older version creates a new history entry (not a destructive revert)

---

## C2 — Notifications

In-app inbox. `NotificationBell` in header.

### Table (PR 2)

`notifications` — see [01-schema-additions.md](./01-schema-additions.md) §3.

### Persistence (PR 3)

**File:** `apps/web/src/lib/persistence/notifications.ts`

```ts
listNotifications(userId, opts: { unreadOnly?: boolean; limit?: number; cursor?: string })
countUnread(userId)
createNotification(userId, input: { type, title, message, data? })
createNotificationsBatch(userIds: string[], input)
markRead(userId, notificationIds: string[])
markAllRead(userId)
dismiss(userId, notificationId)
```

### DAL (PR 3)

**File:** `apps/web/src/lib/api/dal/notifications.ts`

### Routes (PR 3)

| Route | Method |
|---|---|
| `/api/v1/notifications` | `GET` (query `?unreadOnly=`, `?limit=`, `?cursor=`), `POST` (admin/system only) |
| `/api/v1/notifications/count` | `GET` |
| `/api/v1/notifications/[id]` | `PATCH` (mark read), `DELETE` (dismiss) |
| `/api/v1/notifications/mark-all-read` | `POST` |

### Notification producers (PR 3, side-effect wiring)

Where notifications get inserted today:

- `share_viewed` — when an anonymous viewer hits `/share/[shareId]` ([already has hook in `apps/web/src/lib/persistence/conversationShares.ts`?] — verify; if not, add insert in the share view route)
- `comparison_complete` — when last assistant in a comparison group completes (insert in generation v2 service, behind feature flag from `adminSettings.features.notifications`)
- `generation_failed` — on generation failure (existing failure-injection tests should cover)
- `byod_health` — admin-triggered or job-driven, see B2e
- `system` — manual

### Realtime delivery

For v1: client polls `/api/v1/notifications/count` every 30s while page visible. Future: SSE.

### Wire-up (PR 5)

Replace stubs in `apps/web/src/components/notifications/NotificationBell.tsx:17-29`:

```ts
const { data: unreadCount } = useQuery({
  queryKey: ["notifications", "count"],
  queryFn: () => fetch("/api/v1/notifications/count").then(r => r.json()).then(j => j.data?.count ?? 0),
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
});

const { data: notifications } = useQuery({
  queryKey: ["notifications", "list"],
  queryFn: () => fetch("/api/v1/notifications?limit=20").then(r => r.json()).then(j => j.data ?? []),
  enabled: open,                  // only when popover open
});

const markRead = async ({ notificationId }: { notificationId: string }) => {
  await fetch(`/api/v1/notifications/${notificationId}`, { method: "PATCH", body: JSON.stringify({ read: true }) });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
};

const markAllRead = async () => {
  await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
};

const dismiss = async ({ notificationId }: { notificationId: string }) => {
  await fetch(`/api/v1/notifications/${notificationId}`, { method: "DELETE" });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
};
```

### Tests

- `apps/web/src/app/api/v1/__tests__/notifications.test.ts` — CRUD + count + mark-all
- E2E in `apps/web/e2e/notifications.spec.ts` — hit a share, assert owner sees `share_viewed` notification.

### Acceptance

- Empty state renders "No notifications"
- Producer fires (e.g. someone views a share) → bell shows badge "1"
- Click bell → popover lists, click → marks read + navigates if `data.conversationId`
- "Mark all read" clears badge
- Dismiss removes from list and badge

---

## C3 — OnboardingTour

React 19-compatible custom tour (replaces react-joyride). State currently fake (`tourCompleted: true` hardcoded).

### Table (PR 2)

`userOnboarding` — see §4 of [01-schema-additions.md](./01-schema-additions.md).

### Persistence (PR 3)

**File:** `apps/web/src/lib/persistence/onboarding.ts`

```ts
getOnboarding(userId)
ensureOnboarding(userId)              // upsert default row
markTourCompleted(userId, opts: { skipped?: boolean })
resetTour(userId)                     // for "Restart tour" in UISettings
setOnboardingFlag(userId, flag: keyof OnboardingFlags, value: boolean)
```

### DAL + Routes (PR 3)

**File:** `apps/web/src/lib/api/dal/onboarding.ts`

| Route | Method |
|---|---|
| `/api/v1/onboarding` | `GET`, `PATCH` |
| `/api/v1/onboarding/reset` | `POST` |

PATCH body:

```ts
{
  tourCompleted?: boolean;
  tourSkipped?: boolean;
  flags?: Partial<OnboardingFlags>;
  autoRouterPreferenceSet?: boolean;
}
```

### Wire-up (PR 5)

Replace stubs in `apps/web/src/components/onboarding/OnboardingTour.tsx:160-167`:

```ts
const { data: onboarding } = useQuery({
  queryKey: ["onboarding"],
  queryFn: async () => {
    const res = await fetch("/api/v1/onboarding");
    return res.ok ? (await res.json()).data : null;
  },
});

const initializeOnboarding = async () => {
  await fetch("/api/v1/onboarding", { method: "PATCH", body: JSON.stringify({}) });
  queryClient.invalidateQueries({ queryKey: ["onboarding"] });
};

const completeTour = async ({ skipped }: { skipped: boolean }) => {
  await fetch("/api/v1/onboarding", {
    method: "PATCH",
    body: JSON.stringify({ tourCompleted: true, tourSkipped: skipped }),
  });
  queryClient.invalidateQueries({ queryKey: ["onboarding"] });
};
```

And `apps/web/src/components/settings/UISettings.tsx:242` (reset button):

```ts
const resetTour = async () => {
  await fetch("/api/v1/onboarding/reset", { method: "POST" });
  queryClient.invalidateQueries({ queryKey: ["onboarding"] });
  toast.success("Tour will replay on next dashboard visit");
};
```

`AutoRouterPreferenceModal.tsx` first-run flag: PATCH `{ autoRouterPreferenceSet: true }` after user picks. Modal hidden if `onboarding?.autoRouterPreferenceSet` is true.

### Tests

- `apps/web/src/app/api/v1/__tests__/onboarding.test.ts`
- E2E: fresh user → tour shows → close → re-render → tour hidden → reset → tour shows again

---

## C4 — Admin Settings (cross-ref B8)

See [03-cat-b-routes.md](./03-cat-b-routes.md) §B8 for the route. The schema (`adminSettings`) is in [01-schema-additions.md](./01-schema-additions.md) §5.

### Wire-up (PR 5)

5 admin settings panels each call `GET /api/v1/admin/settings` and `PATCH /api/v1/admin/settings`:

- `apps/web/src/components/settings/admin/AdminLimitsSettings.tsx`
- `apps/web/src/components/settings/admin/AdminSearchSettings.tsx`
- `apps/web/src/components/settings/admin/AdminMemorySettings.tsx`
- `apps/web/src/components/settings/admin/AdminTranscriptProviderSettings.tsx`
- `apps/web/src/components/settings/admin/FeaturesSettings.tsx`

Each panel only PATCHes its sub-namespace (e.g. `{ features: { canvasMode: true } }` deep-merges). The route handles deep merge.

### Consumer wiring

**Critical:** features the rest of the app gates on must read from this table:

- `features.canvasMode` → `ChatConversationPageClient` won't render `<CanvasPanel>` if disabled.
- `features.comparisonMode` → comparison UI hidden if disabled.
- `features.notifications` → `NotificationBell` hidden if disabled.
- `features.imageGeneration` / `voiceInput` / `codeExecution` / `autoRouter` → respective tools/picker entries hidden.
- `defaultMonthlyBudget` etc. → seed for new user records.
- `transcriptProvider.primary/fallback` → existing transcribe action picks provider (currently hardcoded? — verify and refactor).

Add a server-side `getAdminSettings()` in `apps/web/src/lib/persistence/adminSettings.ts` returning cached singleton. Client-side `useAdminSettings()` for components that need to gate UI. Hook reads `/api/v1/settings/public-features` (NEW small route exposing only the public subset — features and limits).

**New route:** `GET /api/v1/settings/public-features` — returns `{ features, limits: { defaultMonthlyBudget, defaultDailyMessageLimit } }`. Public to authenticated users (not admin). Solves the "non-admin client wants to know if comparison is enabled" problem without exposing all admin settings.

---

## C5 — Auto-Router config (cross-ref B3)

Schema in §6 of [01-schema-additions.md](./01-schema-additions.md). Route in §B3. Persistence in `apps/web/src/lib/persistence/autoRouter.ts`.

### Consumer wiring (PR 5)

The auto-router runtime (in `packages/auto-router`) currently reads its config from constants. Refactor to:

1. Default config from `defaultAutoRouterConfig`
2. Override from `autoRouterConfig` singleton (server-side cached, 30s TTL)

Add a method `loadAutoRouterConfig()` invoked at runtime startup of the router (e.g. inside `apps/web/src/lib/router/index.ts`).

`apps/web/src/lib/models/repository.ts` `useRouterConfig()`:

- For admins: fetch `/api/v1/admin/auto-router/config`
- For non-admins: fetch `/api/v1/auto-router/public` (NEW small route returning public-safe subset like `enabled` + `defaultStrategy`)

---

## C6 — Admin Models (cross-ref B9)

See [03-cat-b-routes.md](./03-cat-b-routes.md) §B9 for the routes. Schema (`modelOverrides`, `modelChangeLog`) in §7, §8 of [01-schema-additions.md](./01-schema-additions.md).

### Consumer wiring (PR 5)

Replace `useModels()` in `apps/web/src/lib/models/repository.ts:29-34` with a query:

```ts
export function useModels(options?: {...}): Record<string, ModelConfig> | undefined {
  const { data } = useQuery({
    queryKey: ["models", options],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (options?.includeDeprecated) qs.set("includeDeprecated", "1");
      if (options?.includeInternalOnly) qs.set("includeInternalOnly", "1");
      const res = await fetch(`/api/v1/models?${qs}`);
      const json = await res.json();
      return json.data;
    },
    staleTime: 60_000,
  });
  return data ?? filterStaticModels(options);     // fallback to static config while loading
}
```

**New route:** `GET /api/v1/models` returns the merged effective model list (static + overrides). Non-admin gets the same view minus internal-only.

`useModel(modelId)` similarly switches to merged read with static fallback.

`useModelHistory`, `useModelStats`, `useAllModels` become real (admin-only).

---

## C7 — Pro model access check (already covered by Cat A)

`apps/web/src/components/chat/QuickModelSwitcher.tsx:75` — see [02-cat-a-wireup.md](./02-cat-a-wireup.md) §A8. Reads `currentUser.tier` + admin settings limits.

---

## C8 — Bible verse cache (already covered by Cat A)

See §A7 — relabel to `PERF` followup, no Phase G work.

---

## File creation summary for PR 3

```
apps/web/src/lib/persistence/
├── canvas.ts                 NEW
├── notifications.ts          NEW
├── onboarding.ts             NEW
├── adminSettings.ts          NEW
├── autoRouter.ts             NEW
├── modelOverrides.ts         NEW
├── modelChangeLog.ts         NEW
└── usageAggregates.ts        NEW

apps/web/src/lib/api/dal/
├── canvas.ts                 NEW
├── notifications.ts          NEW
├── onboarding.ts             NEW
├── adminSettings.ts          NEW
├── adminModels.ts            NEW
├── autoRouter.ts             NEW
├── userAnalytics.ts          NEW
├── adminUsageAggregate.ts    NEW
├── meetingExtraction.ts      NEW
├── modelPreview.ts           NEW
└── import.ts                 NEW

apps/web/src/app/api/v1/
├── canvas/documents/route.ts                      NEW
├── canvas/documents/[id]/route.ts                 NEW
├── canvas/documents/[id]/history/route.ts         NEW
├── canvas/documents/[id]/restore/route.ts         NEW
├── conversations/[id]/active-canvas/route.ts      NEW
├── notifications/route.ts                         NEW
├── notifications/count/route.ts                   NEW
├── notifications/[id]/route.ts                    NEW
├── notifications/mark-all-read/route.ts           NEW
├── onboarding/route.ts                            NEW
├── onboarding/reset/route.ts                      NEW
├── admin/settings/route.ts                        NEW
├── admin/auto-router/config/route.ts              NEW
├── admin/byod/stats/route.ts                      NEW
├── admin/byod/instances/route.ts                  NEW
├── admin/byod/health-check/route.ts               NEW
├── admin/byod/run-migrations/route.ts             NEW
├── admin/byod/send-notifications/route.ts         NEW
├── admin/usage/monthly-total/route.ts             NEW
├── admin/usage/daily-spend/route.ts               NEW
├── admin/usage/spend-by-model/route.ts            NEW
├── admin/usage/conversation-costs/route.ts        NEW
├── admin/usage/cost-by-feature/route.ts           NEW
├── admin/user-count/route.ts                      NEW
├── admin/models/route.ts                          NEW
├── admin/models/[id]/route.ts                     NEW
├── admin/models/[id]/history/route.ts             NEW
├── admin/models/[id]/deprecate/route.ts           NEW
├── admin/models/[id]/reactivate/route.ts          NEW
├── admin/models/duplicate/route.ts                NEW
├── usage/summary/route.ts                         NEW
├── usage/daily-spend/route.ts                     NEW
├── usage/spend-by-model-detailed/route.ts         NEW
├── usage/cost-by-type/route.ts                    NEW
├── usage/cost-by-feature/route.ts                 NEW
├── usage/activity-stats/route.ts                  NEW
├── usage/total-counts/route.ts                    NEW
├── usage/streaks/route.ts                         NEW
├── usage/heatmap/route.ts                         NEW
├── usage/percentile-ranking/route.ts              NEW
├── usage/action-stats/route.ts                    NEW
├── usage/byok-breakdown/route.ts                  NEW
├── notes/[id]/tags/route.ts                       NEW
├── actions/extract-meeting/route.ts               NEW
├── conversations/[id]/model-preview/route.ts      NEW
├── conversations/[id]/model-recommendation/dismiss/route.ts   NEW (verify)
├── models/route.ts                                NEW (merged model list)
├── settings/public-features/route.ts              NEW (public subset of admin settings)
├── auto-router/public/route.ts                    NEW (public subset of auto-router config)
└── import/conversations/route.ts                  NEW
```

That's **47 new route files**, **8 new persistence files**, **11 new DAL files**.
