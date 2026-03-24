/**
 * API client mutation wrappers for CLI.
 */

import type { BlahClient, GenerationRequest } from "@blah-chat/api-client";
import type { Id } from "./types.js";

export interface SendMessageArgs {
  conversationId: Id<"conversations">;
  content: string;
  modelId?: string;
}

export type SendMessageResult = GenerationRequest & {
  requestId: Id<"generationRequests">;
  conversationId: Id<"conversations">;
  userMessageId: Id<"messages">;
  assistantMessageIds: Id<"messages">[];
};

export interface CreateConversationArgs {
  title?: string;
  model?: string;
}

export interface CreateConversationResult {
  conversationId: Id<"conversations">;
}

export async function sendMessage(
  client: BlahClient,
  _apiKey: string,
  args: SendMessageArgs,
): Promise<SendMessageResult> {
  return client.sendCliMessage(args.conversationId, {
    content: args.content,
    modelId: args.modelId,
  }) as Promise<SendMessageResult>;
}

export async function createConversation(
  client: BlahClient,
  _apiKey: string,
  args: CreateConversationArgs = {},
): Promise<CreateConversationResult> {
  return client.cliRpc("createConversation", {
    title: args.title,
    model: args.model,
  });
}

export async function archiveConversation(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
): Promise<void> {
  await client.cliRpc("archiveConversation", {
    conversationId,
  });
}

export async function deleteConversation(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
): Promise<void> {
  await client.cliRpc("deleteConversation", {
    conversationId,
  });
}

export async function updateConversationModel(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
  model: string,
): Promise<void> {
  await client.cliRpc("updateConversationModel", {
    conversationId,
    model,
  });
}

export async function renameConversation(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
  title: string,
): Promise<void> {
  await client.cliRpc("renameConversation", {
    conversationId,
    title,
  });
}

export async function createBookmark(
  client: BlahClient,
  _apiKey: string,
  messageId: Id<"messages">,
  conversationId: Id<"conversations">,
  note?: string,
): Promise<{ bookmarkId: Id<"bookmarks"> }> {
  return client.cliRpc("createBookmark", {
    messageId,
    conversationId,
    note,
  });
}
