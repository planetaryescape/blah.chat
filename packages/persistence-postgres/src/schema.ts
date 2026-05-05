import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { vectorType } from "./vector-type";

const now = () => Date.now();
const id = () => nanoid();

export const schemaVersion = "v1";

export interface ConversationModelRecommendation {
  suggestedModelId: string;
  currentModelId: string;
  reasoning: string;
  estimatedSavings: {
    percentSaved: number;
  };
  createdAt: number;
  dismissed: boolean;
}

export interface ConversationIncognitoSettings {
  enableReadTools: boolean;
  applyCustomInstructions: boolean;
  inactivityTimeoutMinutes?: number;
  lastActivityAt: number;
}

export interface FeedbackEntryTriage {
  suggestedPriority: string;
  suggestedTags: string[];
  triageNotes: string;
  summary?: string;
  category?: string;
  actionable?: boolean;
  sentiment?: string;
  createdAt: number;
}

export interface KnowledgeSourceVideoMetadata {
  videoId: string;
  duration?: number;
  channel?: string;
  thumbnailUrl?: string;
}

export interface StarterSuggestionRecord {
  id: string;
  text: string;
  icon: "sparkles" | "brain" | "zap" | "penLine";
}

export interface StarterSuggestionsCacheRecord {
  suggestions: StarterSuggestionRecord[];
  needsRefresh: boolean;
  generatedAt: number;
  source: "cache" | "fallback";
}

export interface ByokValidationTimestamps {
  vercelGateway?: number;
  openRouter?: number;
  groq?: number;
  deepgram?: number;
}

export interface TaskSourceContext {
  snippet?: string;
  timestampSeconds?: number;
  confidence?: number;
}

export interface AttachmentMetadata {
  width?: number;
  height?: number;
  duration?: number;
  prompt?: string;
  model?: string;
  generationTime?: number;
  totalTime?: number;
  cost?: number;
}

export type UsageFeature =
  | "chat"
  | "notes"
  | "tasks"
  | "files"
  | "memory"
  | "smart_assistant"
  | "slides";

export type UsageOperationType = "text" | "tts" | "stt" | "image" | "embedding";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(id),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const adminUserTierEnum = pgEnum("admin_user_tier", [
  "free",
  "tier1",
  "tier2",
]);

export type AdminUserTier = (typeof adminUserTierEnum.enumValues)[number];

export const userAdminSettings = pgTable("user_admin_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  tier: adminUserTierEnum("tier").notNull().default("free"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  model: text("model").notNull(),
  modelRecommendation: jsonb(
    "model_recommendation",
  ).$type<ConversationModelRecommendation>(),
  activeLeafMessageId: text("active_leaf_message_id"),
  projectId: text("project_id"),
  isIncognito: boolean("is_incognito").notNull().default(false),
  incognitoSettings:
    jsonb("incognito_settings").$type<ConversationIncognitoSettings>(),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  /** Per-conversation reasoning effort: "none" | "low" | "medium" | "high". */
  thinkingEffort: text("thinking_effort").notNull().default("none"),
  /** Conversation rendering mode: "chat" | "document". Drives canvas auto-open. */
  mode: text("mode").notNull().default("chat"),
  /** Loose pointer to the canvas document currently bound to this conversation. */
  activeDocumentId: text("active_document_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

/**
 * Canvas documents — artifact-style files belonging to a user, optionally
 * linked to the conversation that originated them.
 */
export const documents = pgTable("documents", {
  id: text("id").primaryKey().$defaultFn(id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  /** "code" | "prose" — matches the ArtifactCard documentType. */
  documentType: text("document_type").notNull().default("prose"),
  language: text("language"),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

/**
 * Append-only revision log for `documents`. Stores full content snapshots
 * per version (TOAST-friendly; render diffs lazily). Sources:
 *   - "user_edit" — interactive panel edit
 *   - "ai_edit"   — assistant-driven edit during a generation
 *   - "conflict_resolution" — output of ConflictDialog merge
 *   - "restore"   — explicit jump-to-version creates a new revision
 */
export type DocumentRevisionSource =
  | "user_edit"
  | "ai_edit"
  | "conflict_resolution"
  | "restore";

export const documentRevisions = pgTable(
  "document_revisions",
  {
    id: text("id").primaryKey().$defaultFn(id),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: bigint("version", { mode: "number" }).notNull(),
    content: text("content").notNull(),
    diffSummary: text("diff_summary"),
    source: text("source").$type<DocumentRevisionSource>().notNull(),
    messageId: text("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index("document_revisions_by_document").on(t.documentId, t.version),
    index("document_revisions_by_user").on(t.userId),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.key],
    }),
  }),
);

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(id),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  clientMessageId: text("client_message_id"),
  status: text("status").notNull().default("complete"),
  model: text("model"),
  comparisonGroupId: text("comparison_group_id"),
  consolidatedMessageId: text("consolidated_message_id"),
  isConsolidation: boolean("is_consolidation").notNull().default(false),
  rootMessageId: text("root_message_id"),
  siblingIndex: bigint("sibling_index", { mode: "number" })
    .notNull()
    .default(0),
  forkReason: text("fork_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey().$defaultFn(id),
  messageId: text("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  key: text("key").notNull(),
  bucket: text("bucket").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  metadata: jsonb("metadata").$type<AttachmentMetadata>(),
  extractedText: text("extracted_text"),
  extractionError: text("extraction_error"),
  extractedAt: bigint("extracted_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const ttsCache = pgTable(
  "tts_cache",
  {
    hash: text("hash").primaryKey(),
    bucket: text("bucket").notNull(),
    key: text("key").notNull(),
    text: text("text").notNull(),
    voice: text("voice").notNull(),
    speed: doublePrecision("speed").notNull(),
    format: text("format").notNull(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    lastAccessedAt: bigint("last_accessed_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byKey: uniqueIndex("tts_cache_by_key").on(table.bucket, table.key),
  }),
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    model: text("model").notNull(),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    feature: text("feature").$type<UsageFeature>(),
    operationType: text("operation_type").$type<UsageOperationType>(),
    inputTokens: bigint("input_tokens", { mode: "number" })
      .notNull()
      .default(0),
    outputTokens: bigint("output_tokens", { mode: "number" })
      .notNull()
      .default(0),
    reasoningTokens: bigint("reasoning_tokens", { mode: "number" }),
    cost: doublePrecision("cost").notNull(),
    messageCount: bigint("message_count", { mode: "number" })
      .notNull()
      .default(1),
    isByok: boolean("is_byok"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("usage_records_by_user").on(table.userId),
    byUserDate: index("usage_records_by_user_date").on(
      table.userId,
      table.date,
    ),
    byUserDateModel: index("usage_records_by_user_date_model").on(
      table.userId,
      table.date,
      table.model,
    ),
    byConversation: index("usage_records_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const messageToolCalls = pgTable(
  "message_tool_calls",
  {
    id: text("id").primaryKey().$defaultFn(id),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toolCallId: text("tool_call_id").notNull(),
    toolName: text("tool_name").notNull(),
    args: jsonb("args").$type<unknown>().notNull(),
    result: jsonb("result").$type<unknown>(),
    textPosition: bigint("text_position", { mode: "number" }),
    isPartial: boolean("is_partial").notNull().default(false),
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byMessage: index("message_tool_calls_by_message").on(table.messageId),
    byConversation: index("message_tool_calls_by_conversation").on(
      table.conversationId,
    ),
    byUser: index("message_tool_calls_by_user").on(table.userId),
    byMessagePartial: index("message_tool_calls_by_message_partial").on(
      table.messageId,
      table.isPartial,
    ),
    byMessageToolCallId: uniqueIndex(
      "message_tool_calls_by_message_tool_call_id",
    ).on(table.messageId, table.toolCallId),
  }),
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    note: text("note"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("bookmarks_by_user").on(table.userId),
    byMessage: index("bookmarks_by_message").on(table.messageId),
    byConversation: index("bookmarks_by_conversation").on(table.conversationId),
    byUserCreated: index("bookmarks_by_user_created").on(
      table.userId,
      table.createdAt,
    ),
    byUserMessage: uniqueIndex("bookmarks_by_user_message").on(
      table.userId,
      table.messageId,
    ),
  }),
);

export const feedbackEntries = pgTable(
  "feedback_entries",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    userName: text("user_name").notNull(),
    page: text("page").notNull(),
    feedbackType: text("feedback_type").notNull(),
    description: text("description").notNull(),
    whatTheyDid: text("what_they_did"),
    whatTheySaw: text("what_they_saw"),
    whatTheyExpected: text("what_they_expected"),
    screenshotKey: text("screenshot_key"),
    userSuggestedUrgency: text("user_suggested_urgency"),
    status: text("status").notNull(),
    priority: text("priority").notNull().default("none"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    aiTriage: jsonb("ai_triage").$type<FeedbackEntryTriage>(),
    errorContext: jsonb("error_context").$type<Record<string, unknown>>(),
    archivedAt: bigint("archived_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("feedback_entries_by_user").on(table.userId),
    byStatus: index("feedback_entries_by_status").on(table.status),
    byType: index("feedback_entries_by_type").on(table.feedbackType),
  }),
);

export const sourceMetadata = pgTable(
  "source_metadata",
  {
    id: text("id").primaryKey().$defaultFn(id),
    urlHash: text("url_hash").notNull(),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    ogImage: text("og_image"),
    favicon: text("favicon"),
    siteName: text("site_name"),
    enriched: boolean("enriched").notNull().default(false),
    error: text("error"),
    firstSeenAt: bigint("first_seen_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    lastAccessedAt: bigint("last_accessed_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    accessCount: bigint("access_count", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUrlHash: uniqueIndex("source_metadata_by_url_hash").on(table.urlHash),
    byUrl: index("source_metadata_by_url").on(table.url),
  }),
);

export const messageSources = pgTable(
  "message_sources",
  {
    id: text("id").primaryKey().$defaultFn(id),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    position: bigint("position", { mode: "number" }).notNull(),
    provider: text("provider").notNull().default("unknown"),
    title: text("title").notNull(),
    snippet: text("snippet"),
    urlHash: text("url_hash").notNull(),
    url: text("url").notNull(),
    isPartial: boolean("is_partial").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byMessage: index("message_sources_by_message").on(table.messageId),
    byConversation: index("message_sources_by_conversation").on(
      table.conversationId,
    ),
    byUrlHash: index("message_sources_by_url_hash").on(table.urlHash),
  }),
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    storageKey: text("storage_key"),
    url: text("url"),
    rawContent: text("raw_content"),
    videoMetadata:
      jsonb("video_metadata").$type<KnowledgeSourceVideoMetadata>(),
    mimeType: text("mime_type"),
    size: bigint("size", { mode: "number" }),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    chunkCount: bigint("chunk_count", { mode: "number" }),
    processedAt: bigint("processed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("knowledge_sources_by_user").on(table.userId),
    byStatus: index("knowledge_sources_by_status").on(table.status),
    byProject: index("knowledge_sources_by_project").on(table.projectId),
    byUserType: index("knowledge_sources_by_user_type").on(
      table.userId,
      table.type,
    ),
  }),
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt"),
    isTemplate: boolean("is_template").notNull().default(false),
    createdFrom: text("created_from"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("projects_by_user").on(table.userId),
    byUserTemplate: index("projects_by_user_template").on(
      table.userId,
      table.isTemplate,
    ),
  }),
);

export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    isBuiltIn: boolean("is_built_in").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    usageCount: bigint("usage_count", { mode: "number" }).notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("templates_by_user").on(table.userId),
    byCategory: index("templates_by_category").on(
      table.category,
      table.isBuiltIn,
    ),
  }),
);

export const starterSuggestionCaches = pgTable(
  "starter_suggestion_caches",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    suggestions: jsonb("suggestions")
      .$type<StarterSuggestionRecord[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    needsRefresh: boolean("needs_refresh").notNull().default(false),
    generatedAt: bigint("generated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    source: text("source").notNull().default("cache"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: uniqueIndex("starter_suggestion_caches_by_user").on(table.userId),
  }),
);

export const cliApiKeys = pgTable(
  "cli_api_keys",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    name: text("name").notNull(),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    revokedAt: bigint("revoked_at", { mode: "number" }),
  },
  (table) => ({
    byUser: index("cli_api_keys_by_user").on(table.userId),
    byKeyHash: uniqueIndex("cli_api_keys_by_key_hash").on(table.keyHash),
  }),
);

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    byokEnabled: boolean("byok_enabled").notNull().default(false),
    encryptedVercelGatewayKey: text("encrypted_vercel_gateway_key"),
    encryptedOpenRouterKey: text("encrypted_open_router_key"),
    encryptedGroqKey: text("encrypted_groq_key"),
    encryptedDeepgramKey: text("encrypted_deepgram_key"),
    encryptionIVs: text("encryption_ivs"),
    authTags: text("auth_tags"),
    lastValidated: jsonb("last_validated").$type<ByokValidationTimestamps>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: uniqueIndex("user_api_keys_by_user").on(table.userId),
  }),
);

export const composioConnections = pgTable(
  "composio_connections",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    composioConnectionId: text("composio_connection_id").notNull(),
    integrationId: text("integration_id").notNull(),
    integrationName: text("integration_name").notNull(),
    status: text("status").notNull(),
    scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`),
    oauthState: text("oauth_state"),
    oauthStateExpiresAt: bigint("oauth_state_expires_at", { mode: "number" }),
    connectedAt: bigint("connected_at", { mode: "number" }),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
    lastError: text("last_error"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("composio_connections_by_user").on(table.userId),
    byUserIntegration: uniqueIndex(
      "composio_connections_by_user_integration",
    ).on(table.userId, table.integrationId),
    byConnection: uniqueIndex("composio_connections_by_connection_id").on(
      table.composioConnectionId,
    ),
  }),
);

export const conversationIntegrationEvents = pgTable(
  "conversation_integration_events",
  {
    id: text("id").primaryKey().$defaultFn(id),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    integrationName: text("integration_name").notNull(),
    action: text("action").notNull(),
    source: text("source").notNull().default("composer"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byConversation: index("conversation_integration_events_by_conversation").on(
      table.conversationId,
      table.createdAt,
    ),
    byUser: index("conversation_integration_events_by_user").on(table.userId),
  }),
);

export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sourceMessageId: text("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    sourceConversationId: text("source_conversation_id").references(
      () => conversations.id,
      {
        onDelete: "set null",
      },
    ),
    projectId: text("project_id"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    suggestedTags: text("suggested_tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isPinned: boolean("is_pinned").notNull().default(false),
    shareId: text("share_id"),
    isPublic: boolean("is_public").notNull().default(false),
    sharePassword: text("share_password"),
    shareExpiresAt: bigint("share_expires_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("notes_by_user").on(table.userId),
    byUserUpdated: index("notes_by_user_updated").on(
      table.userId,
      table.updatedAt,
    ),
    byProject: index("notes_by_project").on(table.projectId),
    bySourceMessage: index("notes_by_source_message").on(table.sourceMessageId),
    byShareId: uniqueIndex("notes_by_share_id").on(table.shareId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("in_progress"),
    deadline: bigint("deadline", { mode: "number" }),
    deadlineSource: text("deadline_source"),
    urgency: text("urgency"),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    sourceContext: jsonb("source_context").$type<TaskSourceContext>(),
    projectId: text("project_id"),
    priority: bigint("priority", { mode: "number" }),
    position: bigint("position", { mode: "number" }),
    completedAt: bigint("completed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("tasks_by_user").on(table.userId),
    byUserStatus: index("tasks_by_user_status").on(table.userId, table.status),
    byUserDeadline: index("tasks_by_user_deadline").on(
      table.userId,
      table.deadline,
    ),
    byProject: index("tasks_by_project").on(table.projectId),
    byUserProject: index("tasks_by_user_project").on(
      table.userId,
      table.projectId,
    ),
  }),
);

export const messageEdges = pgTable(
  "message_edges",
  {
    parentMessageId: text("parent_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    childMessageId: text("child_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    position: bigint("position", { mode: "number" }).notNull().default(0),
    edgeType: text("edge_type").notNull().default("reply"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.parentMessageId, table.childMessageId],
    }),
  }),
);

export const generationRequests = pgTable("generation_requests", {
  id: text("id").primaryKey().$defaultFn(id),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userMessageId: text("user_message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  requestedModels: text("requested_models")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  promptOverride: text("prompt_override"),
  status: text("status").notNull().default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const generationRequestIntegrations = pgTable(
  "generation_request_integrations",
  {
    requestId: text("request_id")
      .notNull()
      .references(() => generationRequests.id, { onDelete: "cascade" }),
    integrationId: text("integration_id").notNull(),
    integrationName: text("integration_name").notNull(),
    composioConnectionId: text("composio_connection_id"),
    connectionStatus: text("connection_status"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.requestId, table.integrationId],
    }),
    byRequest: index("generation_request_integrations_by_request").on(
      table.requestId,
      table.createdAt,
    ),
  }),
);

export const comparisonVotes = pgTable("comparison_votes", {
  id: text("id").primaryKey().$defaultFn(id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  comparisonGroupId: text("comparison_group_id").notNull(),
  winnerMessageId: text("winner_message_id"),
  rating: text("rating").notNull(),
  votedAt: bigint("voted_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const generationSessions = pgTable("generation_sessions", {
  id: text("id").primaryKey().$defaultFn(id),
  requestId: text("request_id")
    .notNull()
    .references(() => generationRequests.id, { onDelete: "cascade" }),
  assistantMessageId: text("assistant_message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  modelId: text("model_id").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const generationCheckpoints = pgTable("generation_checkpoints", {
  id: text("id").primaryKey().$defaultFn(id),
  sessionId: text("session_id")
    .notNull()
    .references(() => generationSessions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const consolidations = pgTable(
  "consolidations",
  {
    id: text("id").primaryKey().$defaultFn(id),
    comparisonGroupId: text("comparison_group_id").notNull(),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    userMessageId: text("user_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    consolidatedMessageId: text("consolidated_message_id").references(
      () => messages.id,
      { onDelete: "set null" },
    ),
    modelId: text("model_id").notNull(),
    status: text("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byComparisonGroup: index("consolidations_by_comparison_group").on(
      table.comparisonGroupId,
    ),
    byConversation: index("consolidations_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const routingPolicies = pgTable(
  "routing_policies",
  {
    id: text("id").primaryKey().$defaultFn(id),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(false),
    strategy: text("strategy").notNull().default("outcome_weighted"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byActive: index("routing_policies_by_active").on(table.isActive),
  }),
);

export const routingDecisions = pgTable(
  "routing_decisions",
  {
    id: text("id").primaryKey().$defaultFn(id),
    policyId: text("policy_id").references(() => routingPolicies.id, {
      onDelete: "set null",
    }),
    generationRequestId: text("generation_request_id").references(
      () => generationRequests.id,
      { onDelete: "set null" },
    ),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    routeLabel: text("route_label"),
    selectedModelId: text("selected_model_id").notNull(),
    previousModelId: text("previous_model_id"),
    reasoning: text("reasoning"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byPolicy: index("routing_decisions_by_policy").on(table.policyId),
    byConversation: index("routing_decisions_by_conversation").on(
      table.conversationId,
    ),
    byCreatedAt: index("routing_decisions_by_created_at").on(table.createdAt),
  }),
);

export const routingCandidateScores = pgTable(
  "routing_candidate_scores",
  {
    id: text("id").primaryKey().$defaultFn(id),
    decisionId: text("decision_id")
      .notNull()
      .references(() => routingDecisions.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    provider: text("provider"),
    score: doublePrecision("score").notNull(),
    rank: bigint("rank", { mode: "number" }),
    features: jsonb("features").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byDecision: index("routing_candidate_scores_by_decision").on(
      table.decisionId,
    ),
    byModel: index("routing_candidate_scores_by_model").on(table.modelId),
  }),
);

export const routingOutcomes = pgTable(
  "routing_outcomes",
  {
    id: text("id").primaryKey().$defaultFn(id),
    decisionId: text("decision_id")
      .notNull()
      .references(() => routingDecisions.id, { onDelete: "cascade" }),
    generationRequestId: text("generation_request_id").references(
      () => generationRequests.id,
      { onDelete: "set null" },
    ),
    generationSessionId: text("generation_session_id").references(
      () => generationSessions.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull(),
    ttftMs: bigint("ttft_ms", { mode: "number" }),
    latencyMs: bigint("latency_ms", { mode: "number" }),
    totalTokens: bigint("total_tokens", { mode: "number" }),
    inputTokens: bigint("input_tokens", { mode: "number" }),
    outputTokens: bigint("output_tokens", { mode: "number" }),
    costUsd: doublePrecision("cost_usd"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byDecision: index("routing_outcomes_by_decision").on(table.decisionId),
    bySession: index("routing_outcomes_by_session").on(
      table.generationSessionId,
    ),
    byCreatedAt: index("routing_outcomes_by_created_at").on(table.createdAt),
  }),
);

export const routingFeedback = pgTable(
  "routing_feedback",
  {
    id: text("id").primaryKey().$defaultFn(id),
    outcomeId: text("outcome_id").references(() => routingOutcomes.id, {
      onDelete: "set null",
    }),
    comparisonGroupId: text("comparison_group_id"),
    winnerMessageId: text("winner_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    signal: text("signal").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byOutcome: index("routing_feedback_by_outcome").on(table.outcomeId),
    byComparisonGroup: index("routing_feedback_by_comparison_group").on(
      table.comparisonGroupId,
    ),
    bySignal: index("routing_feedback_by_signal").on(table.signal),
  }),
);

export const providerHealthSnapshots = pgTable(
  "provider_health_snapshots",
  {
    id: text("id").primaryKey().$defaultFn(id),
    provider: text("provider").notNull(),
    modelId: text("model_id"),
    status: text("status").notNull(),
    latencyMs: bigint("latency_ms", { mode: "number" }),
    successRate: doublePrecision("success_rate"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    capturedAt: bigint("captured_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byProvider: index("provider_health_snapshots_by_provider").on(
      table.provider,
    ),
    byCapturedAt: index("provider_health_snapshots_by_captured_at").on(
      table.capturedAt,
    ),
  }),
);

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    id: text("id").primaryKey().$defaultFn(id),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    embedding: vectorType(1536)("embedding").notNull(),
    searchDocument: text("search_document"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byMessage: index("message_embeddings_by_message").on(table.messageId),
    byConversation: index("message_embeddings_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const memoryEmbeddings = pgTable(
  "memory_embeddings",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    sourceMessageId: text("source_message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    category: text("category"),
    embedding: vectorType(1536)("embedding").notNull(),
    searchDocument: text("search_document"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("memory_embeddings_by_user").on(table.userId),
    byConversation: index("memory_embeddings_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const taskEmbeddings = pgTable(
  "task_embeddings",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskKey: text("task_key").notNull(),
    content: text("content").notNull(),
    embedding: vectorType(1536)("embedding").notNull(),
    searchDocument: text("search_document"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("task_embeddings_by_user").on(table.userId),
    byTaskKey: index("task_embeddings_by_task_key").on(table.taskKey),
  }),
);

export const noteEmbeddings = pgTable(
  "note_embeddings",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    noteKey: text("note_key").notNull(),
    content: text("content").notNull(),
    embedding: vectorType(1536)("embedding").notNull(),
    searchDocument: text("search_document"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byUser: index("note_embeddings_by_user").on(table.userId),
    byNoteKey: index("note_embeddings_by_note_key").on(table.noteKey),
  }),
);

export const fileChunks = pgTable(
  "file_chunks",
  {
    id: text("id").primaryKey().$defaultFn(id),
    attachmentId: text("attachment_id").references(() => attachments.id, {
      onDelete: "cascade",
    }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    chunkIndex: bigint("chunk_index", { mode: "number" }).notNull(),
    content: text("content").notNull(),
    searchDocument: text("search_document"),
    embedding: vectorType(1536)("embedding"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byAttachment: index("file_chunks_by_attachment").on(table.attachmentId),
    byConversation: index("file_chunks_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    sourceKey: text("source_key").notNull(),
    chunkIndex: bigint("chunk_index", { mode: "number" }).notNull(),
    content: text("content").notNull(),
    searchDocument: text("search_document"),
    embedding: vectorType(1536)("embedding"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    bySourceKey: index("knowledge_chunks_by_source_key").on(table.sourceKey),
    byConversation: index("knowledge_chunks_by_conversation").on(
      table.conversationId,
    ),
  }),
);

export const routingExamples = pgTable(
  "routing_examples",
  {
    id: text("id").primaryKey().$defaultFn(id),
    text: text("text").notNull(),
    routeLabel: text("route_label").notNull(),
    complexity: text("complexity"),
    source: text("source").notNull().default("seed"),
    embedding: vectorType(1536)("embedding"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    byRouteLabel: index("routing_examples_by_route_label").on(table.routeLabel),
    bySource: index("routing_examples_by_source").on(table.source),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
  preferences: many(userPreferences),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(messages),
    integrationEvents: many(conversationIntegrationEvents),
  }),
);

export const conversationIntegrationEventsRelations = relations(
  conversationIntegrationEvents,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationIntegrationEvents.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationIntegrationEvents.userId],
      references: [users.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  outgoingEdges: many(messageEdges, {
    relationName: "message_outgoing_edges",
  }),
  incomingEdges: many(messageEdges, {
    relationName: "message_incoming_edges",
  }),
  attachments: many(attachments),
  toolCalls: many(messageToolCalls),
}));

export const messageEdgesRelations = relations(messageEdges, ({ one }) => ({
  parent: one(messages, {
    relationName: "message_outgoing_edges",
    fields: [messageEdges.parentMessageId],
    references: [messages.id],
  }),
  child: one(messages, {
    relationName: "message_incoming_edges",
    fields: [messageEdges.childMessageId],
    references: [messages.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
  conversation: one(conversations, {
    fields: [attachments.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
}));

export const messageToolCallsRelations = relations(
  messageToolCalls,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageToolCalls.messageId],
      references: [messages.id],
    }),
    conversation: one(conversations, {
      fields: [messageToolCalls.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [messageToolCalls.userId],
      references: [users.id],
    }),
  }),
);

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const generationRequestsRelations = relations(
  generationRequests,
  ({ one, many }) => ({
    conversation: one(conversations, {
      fields: [generationRequests.conversationId],
      references: [conversations.id],
    }),
    integrations: many(generationRequestIntegrations),
  }),
);

export const generationRequestIntegrationsRelations = relations(
  generationRequestIntegrations,
  ({ one }) => ({
    request: one(generationRequests, {
      fields: [generationRequestIntegrations.requestId],
      references: [generationRequests.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// BYOD Neon – Phase 13
// ---------------------------------------------------------------------------

export const byodNeonConfigs = pgTable(
  "byod_neon_configs",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    encryptedConnectionString: text("encrypted_connection_string").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    authTag: text("auth_tag").notNull(),
    neonProjectId: text("neon_project_id"),
    connectionStatus: text("connection_status").notNull().default("pending"),
    connectionError: text("connection_error"),
    lastHealthCheck: bigint("last_health_check", { mode: "number" }),
    healthLatencyMs: bigint("health_latency_ms", { mode: "number" }),
    consecutiveFailures: bigint("consecutive_failures", { mode: "number" })
      .notNull()
      .default(0),
    schemaVersion: bigint("schema_version", { mode: "number" })
      .notNull()
      .default(0),
    migrationStatus: text("migration_status").notNull().default("pending"),
    migrationError: text("migration_error"),
    lastMigrationAt: bigint("last_migration_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index("byod_neon_configs_connection_status_idx").on(t.connectionStatus),
    index("byod_neon_configs_migration_status_idx").on(t.migrationStatus),
  ],
);

export const byodMigrationLogs = pgTable(
  "byod_migration_logs",
  {
    id: text("id").primaryKey().$defaultFn(id),
    configId: text("config_id")
      .notNull()
      .references(() => byodNeonConfigs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    migrationIndex: bigint("migration_index", { mode: "number" }).notNull(),
    migrationTag: text("migration_tag").notNull(),
    status: text("status").notNull().default("running"),
    error: text("error"),
    durationMs: bigint("duration_ms", { mode: "number" }),
    startedAt: bigint("started_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    completedAt: bigint("completed_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index("byod_migration_logs_config_id_idx").on(t.configId),
    uniqueIndex("byod_migration_logs_config_tag_uniq").on(
      t.configId,
      t.migrationTag,
    ),
  ],
);

export const byodNeonConfigsRelations = relations(
  byodNeonConfigs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [byodNeonConfigs.userId],
      references: [users.id],
    }),
    migrationLogs: many(byodMigrationLogs),
  }),
);

export const byodMigrationLogsRelations = relations(
  byodMigrationLogs,
  ({ one }) => ({
    config: one(byodNeonConfigs, {
      fields: [byodMigrationLogs.configId],
      references: [byodNeonConfigs.id],
    }),
    user: one(users, {
      fields: [byodMigrationLogs.userId],
      references: [users.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// Conversation Shares
// ---------------------------------------------------------------------------

export const conversationShares = pgTable(
  "conversation_shares",
  {
    id: text("id").$defaultFn(id).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id),
    shareId: text("share_id").notNull().unique(),
    title: text("title").notNull(),
    expiresAt: bigint("expires_at", { mode: "number" }),
    isPublic: boolean("is_public").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    password: text("password"),
    anonymizeUsernames: boolean("anonymize_usernames").default(false),
    viewCount: bigint("view_count", { mode: "number" }).notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
    updatedAt: bigint("updated_at", { mode: "number" })
      .notNull()
      .$defaultFn(now),
  },
  (t) => [
    index("conversation_shares_user_idx").on(t.userId),
    index("conversation_shares_conversation_idx").on(t.conversationId),
    uniqueIndex("conversation_shares_share_id_idx").on(t.shareId),
  ],
);

export const conversationSharesRelations = relations(
  conversationShares,
  ({ one }) => ({
    user: one(users, {
      fields: [conversationShares.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [conversationShares.conversationId],
      references: [conversations.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// Admin tunables — global singletons keyed by id = "global"
// ---------------------------------------------------------------------------

export interface AdminSettingsValue {
  limits: {
    defaultMonthlyBudget: number; // USD
    defaultBudgetAlertThreshold: number; // 0..1
    budgetHardLimitEnabled: boolean;
    defaultDailyMessageLimit: number;
    defaultMaxIntegrations: number;
  };
  features: {
    canvasMode: boolean;
    comparisonMode: boolean;
    voiceInput: boolean;
    imageGeneration: boolean;
    codeExecution: boolean;
    autoRouter: boolean;
  };
  proTier: {
    proModelsEnabled: boolean;
    /** 0 = unlimited */
    tier1DailyProModelLimit: number;
    /** 0 = unlimited */
    tier2MonthlyProModelLimit: number;
  };
  search: {
    hybridEnabled: boolean;
    rrfK: number;
    maxResults: number;
    embeddingsEnabled: boolean;
  };
  memory: {
    maxMemoriesPerUser: number;
    autoExtractionEnabled: boolean;
    consolidationIntervalDays: number;
    /** Auto-extract memories every N user/assistant messages (3..20). */
    extractEveryNMessages: number;
  };
  transcriptProvider: {
    provider: "groq" | "openai" | "deepgram" | "assemblyai";
    costPerMinute: number;
  };
}

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(),
  value: jsonb("value").$type<AdminSettingsValue>().notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export interface AutoRouterConfigValue {
  /** Safety multiplier on context window when picking a model. e.g. 1.2 = 20% buffer. */
  contextBuffer: number;
  /** Token count above which the router switches to long-context-capable models. */
  longContextThreshold: number;
  /** Minimum similarity confidence to skip LLM fallback. 0..1. */
  classifierConfidenceThreshold: number;
  /** Number of similar example queries the classifier consults before voting. */
  classifierTopK: number;
  /** When confidence is below threshold, fall back to LLM disambiguation. */
  classifierFallbackEnabled: boolean;
}

export const autoRouterConfig = pgTable("auto_router_config", {
  id: text("id").primaryKey(),
  value: jsonb("value").$type<AutoRouterConfigValue>().notNull(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type MessageToolCall = typeof messageToolCalls.$inferSelect;
export type ConversationIntegrationEvent =
  typeof conversationIntegrationEvents.$inferSelect;
export type GenerationRequestIntegration =
  typeof generationRequestIntegrations.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type SourceMetadata = typeof sourceMetadata.$inferSelect;
export type MessageSource = typeof messageSources.$inferSelect;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type ByodNeonConfig = typeof byodNeonConfigs.$inferSelect;
export type ByodMigrationLog = typeof byodMigrationLogs.$inferSelect;
export type ConversationShare = typeof conversationShares.$inferSelect;
export type AdminSettings = typeof adminSettings.$inferSelect;
export type AutoRouterConfig = typeof autoRouterConfig.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentRevision = typeof documentRevisions.$inferSelect;
