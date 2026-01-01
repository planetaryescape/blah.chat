/**
 * Convex Query Wrappers for CLI
 *
 * Uses CLI-specific public queries that authenticate via API key parameter.
 * These queries are defined in cliAuth.ts in the backend.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { ConvexHttpClient } from "convex/browser";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Conversation {
  _id: Id<"conversations">;
  title: string | null;
  model: string | null;
  pinned: boolean | undefined;
  messageCount: number | undefined;
  lastMessageAt: number | undefined;
  createdAt: number;
}

export interface Message {
  _id: Id<"messages">;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent: string | undefined;
  status:
    | "pending"
    | "generating"
    | "complete"
    | "stopped"
    | "error"
    | undefined;
  error: string | undefined;
  createdAt: number;
  // Model + stats for display
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSecond?: number;
  firstTokenAt?: number;
  generationStartedAt?: number;
}

export interface ListConversationsOptions {
  limit?: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  isPro: boolean;
}

export interface SearchConversationsOptions {
  query: string;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List user's conversations.
 * Returns: sorted by lastMessageAt (desc)
 */
export async function listConversations(
  client: ConvexHttpClient,
  apiKey: string,
  options: ListConversationsOptions = {},
): Promise<Conversation[] | null> {
  return client.query(api.cliAuth.listConversations, {
    apiKey,
    limit: options.limit,
  });
}

/**
 * Get a specific conversation by ID.
 */
export async function getConversation(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Conversation | null> {
  return client.query(api.cliAuth.getConversation, {
    apiKey,
    conversationId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List messages in a conversation.
 * Returns: messages in ascending order (oldest first)
 */
export async function listMessages(
  client: ConvexHttpClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Message[] | null> {
  return client.query(api.cliAuth.listMessages, {
    apiKey,
    conversationId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List available AI models.
 */
export async function listModels(
  client: ConvexHttpClient,
  apiKey: string,
): Promise<Model[] | null> {
  return client.query(api.cliAuth.listModels, { apiKey });
}

/**
 * Get user's default model for new chats.
 */
export async function getUserDefaultModel(
  client: ConvexHttpClient,
  apiKey: string,
): Promise<string> {
  const result = await client.query(api.cliAuth.getUserDefaultModel, {
    apiKey,
  });
  return result || "openai:gpt-5-mini";
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search conversations by title.
 */
export async function searchConversations(
  client: ConvexHttpClient,
  apiKey: string,
  options: SearchConversationsOptions,
): Promise<Conversation[] | null> {
  return client.query(api.cliAuth.searchConversations, {
    apiKey,
    query: options.query,
    limit: options.limit,
  });
}
