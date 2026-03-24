import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

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
  | "smart_assistant";

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
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

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
    isPinned: boolean("is_pinned").notNull().default(false),
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
    embedding: jsonb("embedding").$type<number[]>().notNull(),
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
    embedding: jsonb("embedding").$type<number[]>().notNull(),
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
    embedding: jsonb("embedding").$type<number[]>().notNull(),
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
    embedding: jsonb("embedding").$type<number[]>().notNull(),
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
    embedding: jsonb("embedding").$type<number[]>(),
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
    embedding: jsonb("embedding").$type<number[]>(),
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
    embedding: jsonb("embedding").$type<number[]>(),
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

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type MessageToolCall = typeof messageToolCalls.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type SourceMetadata = typeof sourceMetadata.$inferSelect;
export type MessageSource = typeof messageSources.$inferSelect;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
