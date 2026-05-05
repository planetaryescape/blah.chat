# 01 — Schema Additions

All new tables for Phase G completion. Drizzle ORM, snake_case in DB, camelCase in TS. Follow patterns already in `packages/persistence-postgres/src/schema.ts`.

Migration files generated via `bunx drizzle-kit generate` from `packages/persistence-postgres/`.

## Conventions

- `id` = `text("id").primaryKey().$defaultFn(id)` (nanoid)
- Timestamps as `bigint(..., { mode: "number" })` epoch ms, `$defaultFn(now)`
- Foreign keys to `users.id` always `onDelete: "cascade"` unless content survives user delete (then `set null`)
- All `userId` columns indexed
- JSON blobs use `jsonb` with typed `$type<T>()`
- Boolean defaults explicit

## 1. `canvasDocuments`

Backs Canvas (collaborative document editor) attached to conversations.

```ts
export interface CanvasMetadata {
  language?: string;          // monaco language id
  cursorPosition?: { line: number; column: number };
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
}

export const canvasDocuments = pgTable(
  "canvas_documents",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    contentVersion: bigint("content_version", { mode: "number" })
      .notNull()
      .default(0),
    metadata: jsonb("metadata").$type<CanvasMetadata>().notNull().default({}),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => ({
    byUser: index("canvas_documents_by_user").on(t.userId),
    byConversation: index("canvas_documents_by_conversation").on(
      t.conversationId,
    ),
    byUserUpdated: index("canvas_documents_by_user_updated").on(
      t.userId,
      t.updatedAt,
    ),
  }),
);
```

**Active document linkage:** add a column on `conversations`:

```ts
// inside conversations pgTable definition
activeCanvasDocumentId: text("active_canvas_document_id"),
```

(Self-referencing FK avoided — keep loose, reconcile in DAL.)

## 2. `canvasHistory`

Append-only revision log per document. Powers `VersionHistoryPanel` and conflict resolution.

```ts
export type CanvasHistorySource = "user_edit" | "ai_edit" | "conflict_resolution" | "import";

export const canvasHistory = pgTable(
  "canvas_history",
  {
    id: text("id").primaryKey().$defaultFn(id),
    documentId: text("document_id")
      .notNull()
      .references(() => canvasDocuments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentVersion: bigint("content_version", { mode: "number" }).notNull(),
    content: text("content").notNull(),
    diff: text("diff"),                   // optional human-readable diff string
    source: text("source").$type<CanvasHistorySource>().notNull(),
    messageId: text("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => ({
    byDocument: index("canvas_history_by_document").on(
      t.documentId,
      t.contentVersion,
    ),
    byUser: index("canvas_history_by_user").on(t.userId),
  }),
);
```

## 3. `notifications`

In-app notification inbox.

```ts
export type NotificationType =
  | "share_viewed"
  | "comparison_complete"
  | "generation_failed"
  | "byod_health"
  | "system";

export interface NotificationData {
  conversationId?: string;
  shareId?: string;
  comparisonGroupId?: string;
  generationRequestId?: string;
  url?: string;
  [key: string]: unknown;
}

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    data: jsonb("data").$type<NotificationData>().notNull().default({}),
    read: boolean("read").notNull().default(false),
    readAt: bigint("read_at", { mode: "number" }),
    dismissedAt: bigint("dismissed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => ({
    byUser: index("notifications_by_user").on(t.userId, t.createdAt),
    byUserUnread: index("notifications_by_user_unread")
      .on(t.userId, t.read)
      .where(sql`dismissed_at IS NULL`),
  }),
);
```

## 4. `userOnboarding`

One row per user. Tracks tour status + first-run preferences.

```ts
export interface OnboardingFlags {
  modelPickerSeen?: boolean;
  comparisonModeSeen?: boolean;
  branchingSeen?: boolean;
  attachmentsSeen?: boolean;
}

export const userOnboarding = pgTable(
  "user_onboarding",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    tourCompleted: boolean("tour_completed").notNull().default(false),
    tourSkipped: boolean("tour_skipped").notNull().default(false),
    tourCompletedAt: bigint("tour_completed_at", { mode: "number" }),
    autoRouterPreferenceSet: boolean("auto_router_preference_set")
      .notNull()
      .default(false),
    flags: jsonb("flags").$type<OnboardingFlags>().notNull().default({}),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
);
```

## 5. `adminSettings`

Singleton row keyed by `id = "global"`. Stores all admin-tunable defaults. JSONB so we can extend without migrations.

```ts
export interface AdminSettingsValue {
  // Limits
  defaultMonthlyBudget: number;
  defaultBudgetAlertThreshold: number;       // 0..1
  budgetHardLimitEnabled: boolean;
  defaultDailyMessageLimit: number;
  defaultMaxIntegrations: number;

  // Features (feature flags)
  features: {
    comparisonMode: boolean;
    canvasMode: boolean;
    voiceInput: boolean;
    imageGeneration: boolean;
    codeExecution: boolean;
    autoRouter: boolean;
    notifications: boolean;
  };

  // Search
  search: {
    hybridEnabled: boolean;
    rrfK: number;
    maxResults: number;
    embeddingsEnabled: boolean;
  };

  // Memory
  memory: {
    maxMemoriesPerUser: number;
    autoExtractionEnabled: boolean;
    consolidationIntervalDays: number;
  };

  // Transcript provider
  transcriptProvider: {
    primary: "deepgram" | "whisper" | "assemblyai";
    fallback: "deepgram" | "whisper" | "assemblyai" | null;
  };
}

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(),                // always "global"
  value: jsonb("value").$type<AdminSettingsValue>().notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(now),
});
```

Seeded on first read with defaults defined in `apps/web/src/lib/persistence/adminSettings.ts`.

## 6. `autoRouterConfig`

Singleton config for auto-router. Separated from `adminSettings` because it's edited via `/admin/auto-router` page with its own UI.

```ts
export interface AutoRouterConfigValue {
  enabled: boolean;
  defaultStrategy: "cost_optimised" | "quality_first" | "balanced";
  perClassWeights: {
    coding: { quality: number; cost: number; speed: number };
    creative: { quality: number; cost: number; speed: number };
    factual: { quality: number; cost: number; speed: number };
    conversational: { quality: number; cost: number; speed: number };
  };
  costTierDistribution: {
    high: number;     // 0..1
    medium: number;
    low: number;
  };
  highStakesOverride: boolean;
  shadowEvaluatorEnabled: boolean;
  feedbackLearningRate: number;
  excludedModels: string[];
}

export const autoRouterConfig = pgTable("auto_router_config", {
  id: text("id").primaryKey(),                // always "global"
  value: jsonb("value").$type<AutoRouterConfigValue>().notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(now),
});
```

## 7. `modelOverrides`

Admin overrides on top of static `MODEL_CONFIG` from `@blah-chat/ai/models`. Static config remains source of truth for known models; this table layers overrides + custom models + status changes.

```ts
export type ModelStatus = "active" | "deprecated" | "beta" | "internal";

export interface ModelOverrideValue {
  // Display
  displayName?: string;
  description?: string;

  // Pricing override (per million tokens)
  pricing?: {
    input: number;
    output: number;
    cachedInput?: number;
  };

  // Capabilities
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    reasoning?: boolean;
    streaming?: boolean;
  };

  // Limits
  limits?: {
    contextWindow?: number;
    maxOutputTokens?: number;
  };

  // Routing tags
  tags?: string[];
  costTier?: "high" | "medium" | "low";
  qualityTier?: "high" | "medium" | "low";
  speedTier?: "high" | "medium" | "low";

  notes?: string;
}

export const modelOverrides = pgTable(
  "model_overrides",
  {
    id: text("id").primaryKey().$defaultFn(id),
    modelId: text("model_id").notNull(),       // e.g. "openai:gpt-5"
    isCustom: boolean("is_custom").notNull().default(false), // true = not in static MODEL_CONFIG
    status: text("status").$type<ModelStatus>().notNull().default("active"),
    deprecatedAt: bigint("deprecated_at", { mode: "number" }),
    reactivatedAt: bigint("reactivated_at", { mode: "number" }),
    overrideValue: jsonb("override_value")
      .$type<ModelOverrideValue>()
      .notNull()
      .default({}),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => ({
    byModelId: uniqueIndex("model_overrides_by_model_id").on(t.modelId),
    byStatus: index("model_overrides_by_status").on(t.status),
  }),
);
```

## 8. `modelChangeLog`

Audit log for every admin model mutation. Backs `useModelHistory()`.

```ts
export type ModelChangeType =
  | "created"
  | "updated"
  | "deprecated"
  | "reactivated"
  | "deleted"
  | "duplicated";

export interface ModelChangeDiff {
  field: string;
  before: unknown;
  after: unknown;
}

export const modelChangeLog = pgTable(
  "model_change_log",
  {
    id: text("id").primaryKey().$defaultFn(id),
    modelId: text("model_id").notNull(),
    changeType: text("change_type").$type<ModelChangeType>().notNull(),
    diff: jsonb("diff").$type<ModelChangeDiff[]>().notNull().default([]),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => ({
    byModelId: index("model_change_log_by_model_id").on(
      t.modelId,
      t.createdAt,
    ),
  }),
);
```

## 9. `noteTags` (junction)

`notes.tags` is currently `text[]`. The TODO at `apps/web/src/components/ui/minimal-tag-input.tsx:23` calls `POST/DELETE /api/v1/notes/:id/tags`. Two options:

**Option A — keep `text[]`, mutate via SQL `array_append`/`array_remove`:**

- Simpler, no new table.
- Matches `bookmarks` pattern (`bookmarks` also uses `text[]`).
- Can't query tags as first-class entities (e.g. tag autocomplete across notes).

**Option B — new `noteTags` junction:**

- `(noteId, tag)` rows.
- Enables global tag list, normalized search.
- BYOD allowlist already declares `noteTags`.

**Decision: Option A.** Matches existing `bookmarks/[id]/tags` route exactly (which already uses `text[]`). BYOD allowlist drift is a separate cleanup. Keeps Phase G scope tight.

If we later normalise: a single migration moves the array into the junction.

## 10. `conversations.activeCanvasDocumentId`

Already noted in §1 — single column ALTER on `conversations` to support `useCanvasAutoSync`.

## Migration order

`bunx drizzle-kit generate` will emit one migration per logical group. Stage:

1. `0001_phase_g_canvas.sql` — `canvas_documents`, `canvas_history`, `conversations.active_canvas_document_id`
2. `0002_phase_g_notifications.sql` — `notifications`
3. `0003_phase_g_onboarding.sql` — `user_onboarding`
4. `0004_phase_g_admin_settings.sql` — `admin_settings`, `auto_router_config`
5. `0005_phase_g_admin_models.sql` — `model_overrides`, `model_change_log`

Run via existing migration pipeline (`packages/persistence-postgres/drizzle/`). CI already runs migrations against PGlite per the postgres-rewrite/02-infrastructure-setup.md doc.

## BYOD impact

Add to `packages/shared/src/byod/tables.ts` `BYOD_TABLES` allowlist:

```ts
"canvasDocuments",     // already declared
"canvasHistory",       // already declared
"notifications",       // already declared
"userOnboarding",      // NEW
```

`adminSettings`, `autoRouterConfig`, `modelOverrides`, `modelChangeLog` are **global, not BYOD** — keep on main DB only. BYOD users inherit the global config.

## Type exports

In `packages/persistence-postgres/src/index.ts` add re-exports for new tables and the value-type interfaces (`CanvasMetadata`, `NotificationType`, `NotificationData`, `OnboardingFlags`, `AdminSettingsValue`, `AutoRouterConfigValue`, `ModelOverrideValue`, `ModelStatus`, `ModelChangeType`, `ModelChangeDiff`, `CanvasHistorySource`).

## Default seed values

`packages/persistence-postgres/src/seeds.ts` (new file): exports `defaultAdminSettings` and `defaultAutoRouterConfig` constants. The persistence layer in PR 3 inserts these on first read of the singletons.

## Index sanity

All `userId`-keyed tables get a `(userId, createdAt|updatedAt)` composite index for sidebar/list queries. Match existing patterns in `notes`, `bookmarks`, `tasks`.
