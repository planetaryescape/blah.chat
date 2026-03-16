import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

const now = () => Date.now();
const id = () => nanoid();

export const schemaVersion = "v1";

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
  activeLeafMessageId: text("active_leaf_message_id"),
  archived: boolean("archived").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(id),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("complete"),
  model: text("model"),
  comparisonGroupId: text("comparison_group_id"),
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
  extractedText: text("extracted_text"),
  extractionError: text("extraction_error"),
  extractedAt: bigint("extracted_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
});

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
  status: text("status").notNull().default("pending"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(now),
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

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
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

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
