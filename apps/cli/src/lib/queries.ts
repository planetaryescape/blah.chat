/**
 * SDK query wrappers for CLI.
 */

import type { BlahClient } from "@blah-chat/sdk";
import type { Conversation, Message, Model } from "@blah-chat/sdk/rpc";
import {
  getConversation as getConversationRpc,
  getUserDefaultModel as getUserDefaultModelRpc,
  listConversations as listConversationsRpc,
  listMessages as listMessagesRpc,
  listModels as listModelsRpc,
  searchConversations as searchConversationsRpc,
} from "@blah-chat/sdk/rpc";
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
  apiKey: string,
  options: ListConversationsOptions = {},
): Promise<Conversation[] | null> {
  return listConversationsRpc(client, apiKey, options);
}

export async function getConversation(
  client: BlahClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Conversation | null> {
  return getConversationRpc(client, apiKey, conversationId);
}

export async function listMessages(
  client: BlahClient,
  apiKey: string,
  conversationId: Id<"conversations">,
): Promise<Message[] | null> {
  return listMessagesRpc(client, apiKey, conversationId);
}

export async function listModels(
  client: BlahClient,
  apiKey: string,
): Promise<Model[] | null> {
  return listModelsRpc(client, apiKey);
}

export async function getUserDefaultModel(
  client: BlahClient,
  apiKey: string,
): Promise<string> {
  return getUserDefaultModelRpc(client, apiKey);
}

export async function searchConversations(
  client: BlahClient,
  apiKey: string,
  options: SearchConversationsOptions,
): Promise<Conversation[] | null> {
  return searchConversationsRpc(client, apiKey, options);
}
