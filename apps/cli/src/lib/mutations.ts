/**
 * Convex Mutation Wrappers for CLI
 *
 * Uses CLI-specific public mutations that authenticate via API key parameter.
 * These mutations are defined in cliAuth.ts in the backend.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { ConvexHttpClient } from "convex/browser";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageArgs {
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
}

export interface SendMessageResult {
  userMessageId: Id<"messages">;
  assistantMessageId: Id<"messages">;
}

export interface CreateConversationArgs {
  title?: string;
  model?: string;
}

export interface CreateConversationResult {
  conversationId: Id<"conversations">;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a message in a conversation.
 * Creates user message and assistant placeholder.
 */
export async function sendMessage(
  client: ConvexHttpClient,
  apiKey: string,
  args: SendMessageArgs,
): Promise<SendMessageResult> {
  return client.mutation(api.cliAuth.sendMessage, {
    apiKey,
    conversationId: args.conversationId,
    content: args.content,
    modelId: args.modelId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new conversation.
 */
export async function createConversation(
  client: ConvexHttpClient,
  apiKey: string,
  args: CreateConversationArgs = {},
): Promise<CreateConversationResult> {
  return client.mutation(api.cliAuth.createConversation, {
    apiKey,
    title: args.title,
    model: args.model,
  });
}

/**
 * Archive a conversation (soft delete).
 */
export async function archiveConversation(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<void> {
  await client.mutation(api.cliAuth.archiveConversation, {
    apiKey,
    conversationId,
  });
}

/**
 * Delete a conversation and all its messages (hard delete).
 */
export async function deleteConversation(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<void> {
  await client.mutation(api.cliAuth.deleteConversation, {
    apiKey,
    conversationId,
  });
}

/**
 * Update the model for a conversation.
 */
export async function updateConversationModel(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
  model: string,
): Promise<void> {
  await client.mutation(api.cliAuth.updateConversationModel, {
    apiKey,
    conversationId,
    model,
  });
}

/**
 * Rename a conversation.
 */
export async function renameConversation(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
  title: string,
): Promise<void> {
  await client.mutation(api.cliAuth.renameConversation, {
    apiKey,
    conversationId,
    title,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookmark Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a bookmark for a message.
 */
export async function createBookmark(
  client: ConvexHttpClient,
  apiKey: string,
  messageId: Id<"messages">,
  conversationId: Id<"conversations">,
  note?: string,
): Promise<{ bookmarkId: Id<"bookmarks"> }> {
  return client.mutation(api.cliAuth.createBookmark, {
    apiKey,
    messageId,
    conversationId,
    note,
  });
}
