/**
 * Convex API wrappers for Raycast
 *
 * Direct Convex calls using the same cliAuth endpoints as CLI.
 * Avoids ESM/CJS conflicts by not importing from CLI package.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Types (same as CLI)
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
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  isPro: boolean;
}

export interface SendMessageResult {
  userMessageId: Id<"messages">;
  assistantMessageId: Id<"messages">;
}

export interface CreateConversationResult {
  conversationId: Id<"conversations">;
}

export interface Memory {
  _id: Id<"memories">;
  content: string;
  category: string;
  importance: number | undefined;
  createdAt: number;
}

export interface Project {
  _id: Id<"projects">;
  name: string;
  description: string | undefined;
  createdAt: number;
}

export interface Bookmark {
  _id: Id<"bookmarks">;
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  note: string | undefined;
  tags: string[] | undefined;
  messagePreview: string | undefined;
  createdAt: number;
}

export interface Template {
  _id: Id<"templates">;
  name: string;
  prompt: string;
  description: string | undefined;
  category: string;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function listConversations(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Conversation[] | null> {
  return client.query(api.cliAuth.listConversations, {
    apiKey,
    limit: options.limit,
  });
}

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

export async function listModels(
  client: ConvexHttpClient,
  apiKey: string,
): Promise<Model[] | null> {
  return client.query(api.cliAuth.listModels, { apiKey });
}

export async function getUserDefaultModel(
  client: ConvexHttpClient,
  apiKey: string,
): Promise<string> {
  const result = await client.query(api.cliAuth.getUserDefaultModel, {
    apiKey,
  });
  return result || "openai:gpt-4o";
}

export async function searchConversations(
  client: ConvexHttpClient,
  apiKey: string,
  options: { query: string; limit?: number },
): Promise<Conversation[] | null> {
  return client.query(api.cliAuth.searchConversations, {
    apiKey,
    searchQuery: options.query,
    limit: options.limit,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMessage(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    conversationId: Id<"conversations">;
    content: string;
    modelId?: string;
  },
): Promise<SendMessageResult> {
  return client.mutation(api.cliAuth.sendMessage, {
    apiKey,
    conversationId: args.conversationId,
    content: args.content,
    modelId: args.modelId,
  });
}

export async function createConversation(
  client: ConvexHttpClient,
  apiKey: string,
  args: { title?: string; model?: string } = {},
): Promise<CreateConversationResult> {
  return client.mutation(api.cliAuth.createConversation, {
    apiKey,
    title: args.title,
    model: args.model,
  });
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Feature Queries (Memories, Projects, Bookmarks, Templates)
// ─────────────────────────────────────────────────────────────────────────────

export async function listMemories(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Memory[] | null> {
  return client.query(api.cliAuth.listMemories, {
    apiKey,
    limit: options.limit,
  });
}

export async function listProjects(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Project[] | null> {
  return client.query(api.cliAuth.listProjects, {
    apiKey,
    limit: options.limit,
  });
}

export async function listBookmarks(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Bookmark[] | null> {
  return client.query(api.cliAuth.listBookmarks, {
    apiKey,
    limit: options.limit,
  });
}

export async function listTemplates(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Template[] | null> {
  return client.query(api.cliAuth.listTemplates, {
    apiKey,
    limit: options.limit,
  });
}

export async function createBookmark(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    note?: string;
  },
): Promise<{ bookmarkId: Id<"bookmarks"> }> {
  return client.mutation(api.cliAuth.createBookmark, {
    apiKey,
    messageId: args.messageId,
    conversationId: args.conversationId,
    note: args.note,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks API
// ─────────────────────────────────────────────────────────────────────────────

export interface Task {
  _id: Id<"tasks">;
  title: string;
  description: string | undefined;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  urgency: "low" | "medium" | "high" | "urgent" | undefined;
  deadline: number | undefined;
  deadlineSource: string | undefined;
  projectId: Id<"projects"> | undefined;
  tags: string[] | undefined;
  createdAt: number;
  updatedAt: number;
  completedAt: number | undefined;
}

export async function listTasks(
  client: ConvexHttpClient,
  apiKey: string,
  options: {
    status?: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
    limit?: number;
  } = {},
): Promise<Task[] | null> {
  return client.query(api.cliAuth.listTasks, {
    apiKey,
    status: options.status,
    limit: options.limit,
  });
}

export async function createTask(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    title: string;
    description?: string;
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    projectId?: Id<"projects">;
  },
): Promise<{ taskId: Id<"tasks"> }> {
  return client.mutation(api.cliAuth.createTask, {
    apiKey,
    title: args.title,
    description: args.description,
    urgency: args.urgency,
    deadline: args.deadline,
    deadlineSource: args.deadlineSource,
    projectId: args.projectId,
  });
}

export async function updateTask(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    taskId: Id<"tasks">;
    title?: string;
    description?: string;
    status?: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
  },
): Promise<void> {
  await client.mutation(api.cliAuth.updateTask, {
    apiKey,
    taskId: args.taskId,
    title: args.title,
    description: args.description,
    status: args.status,
    urgency: args.urgency,
    deadline: args.deadline,
  });
}

export async function completeTask(
  client: ConvexHttpClient,
  apiKey: string,
  taskId: Id<"tasks">,
): Promise<void> {
  await client.mutation(api.cliAuth.completeTask, {
    apiKey,
    taskId,
  });
}

export async function deleteTask(
  client: ConvexHttpClient,
  apiKey: string,
  taskId: Id<"tasks">,
): Promise<void> {
  await client.mutation(api.cliAuth.deleteTask, {
    apiKey,
    taskId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notes API
// ─────────────────────────────────────────────────────────────────────────────

export interface Note {
  _id: Id<"notes">;
  title: string;
  content: string;
  isPinned: boolean;
  projectId: Id<"projects"> | undefined;
  tags: string[] | undefined;
  createdAt: number;
  updatedAt: number;
}

export async function listNotes(
  client: ConvexHttpClient,
  apiKey: string,
  options: { limit?: number } = {},
): Promise<Note[] | null> {
  return client.query(api.cliAuth.listNotes, {
    apiKey,
    limit: options.limit,
  });
}

export async function createNote(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    content: string;
    title?: string;
    sourceMessageId?: Id<"messages">;
    sourceConversationId?: Id<"conversations">;
    projectId?: Id<"projects">;
  },
): Promise<{ noteId: Id<"notes"> }> {
  return client.mutation(api.cliAuth.createCliNote, {
    apiKey,
    content: args.content,
    title: args.title,
    sourceMessageId: args.sourceMessageId,
    sourceConversationId: args.sourceConversationId,
    projectId: args.projectId,
  });
}

export async function updateNote(
  client: ConvexHttpClient,
  apiKey: string,
  args: {
    noteId: Id<"notes">;
    title?: string;
    content?: string;
    isPinned?: boolean;
  },
): Promise<void> {
  await client.mutation(api.cliAuth.updateCliNote, {
    apiKey,
    noteId: args.noteId,
    title: args.title,
    content: args.content,
    isPinned: args.isPinned,
  });
}

export async function deleteNote(
  client: ConvexHttpClient,
  apiKey: string,
  noteId: Id<"notes">,
): Promise<void> {
  await client.mutation(api.cliAuth.deleteCliNote, {
    apiKey,
    noteId,
  });
}
