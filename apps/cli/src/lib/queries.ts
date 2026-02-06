/**
 * SDK Query wrappers for CLI.
 */

import type { BlahClient, Conversation, Message, Model } from "@blah-chat/sdk";
import type { Id } from "./types.js";

export type { Conversation, Message, Model };

export interface ListConversationsOptions {
  limit?: number;
}

export interface SearchConversationsOptions {
  query: string;
  limit?: number;
}

export async function listConversations(
  client: BlahClient,
  _apiKey: string,
  options: ListConversationsOptions = {},
): Promise<Conversation[] | null> {
  return client.cliRpc("listConversations", {
    limit: options.limit,
  });
}

export async function getConversation(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Conversation | null> {
  return client.cliRpc("getConversation", {
    conversationId,
  });
}

export async function listMessages(
  client: BlahClient,
  _apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Message[] | null> {
  return client.cliRpc("listMessages", {
    conversationId,
  });
}

export async function listModels(
  client: BlahClient,
  _apiKey: string,
): Promise<Model[] | null> {
  return client.cliRpc("listModels", undefined);
}

export async function getUserDefaultModel(
  client: BlahClient,
  _apiKey: string,
): Promise<string> {
  const result = await client.cliRpc("getUserDefaultModel", undefined);
  return result || "openai:gpt-5-mini";
}

export async function searchConversations(
  client: BlahClient,
  _apiKey: string,
  options: SearchConversationsOptions,
): Promise<Conversation[] | null> {
  return client.cliRpc("searchConversations", {
    query: options.query,
    limit: options.limit,
  });
}
