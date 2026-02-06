/* eslint-disable @typescript-eslint/no-unused-vars -- keep stable wrapper signatures */
import type { BlahClient } from "./client";
import type {
  Bookmark,
  Conversation,
  Memory,
  Message,
  Model,
  Note,
  Project,
  Task,
  Template,
} from "./types";

export type {
  Bookmark,
  Conversation,
  Memory,
  Message,
  Model,
  Note,
  Project,
  Task,
  Template,
};

export type Id<_T extends string = string> = string;

export async function listConversations(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
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
  options: { query: string; limit?: number },
): Promise<Conversation[] | null> {
  return client.cliRpc("searchConversations", {
    query: options.query,
    limit: options.limit,
  });
}

export async function sendMessage(
  client: BlahClient,
  _apiKey: string,
  args: {
    conversationId: Id<"conversations">;
    content: string;
    modelId?: string;
  },
): Promise<{ userMessageId: Id<"messages"> }> {
  return client.cliRpc("sendMessage", {
    conversationId: args.conversationId,
    content: args.content,
    modelId: args.modelId,
  });
}

export async function createConversation(
  client: BlahClient,
  _apiKey: string,
  args: { title?: string; model?: string } = {},
): Promise<{ conversationId: Id<"conversations"> }> {
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

export async function listMemories(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
): Promise<Memory[] | null> {
  return client.cliRpc("listMemories", {
    limit: options.limit,
  });
}

export async function listProjects(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
): Promise<Project[] | null> {
  return client.cliRpc("listProjects", {
    limit: options.limit,
  });
}

export async function listBookmarks(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
): Promise<Bookmark[] | null> {
  return client.cliRpc("listBookmarks", {
    limit: options.limit,
  });
}

export async function listTemplates(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
): Promise<Template[] | null> {
  return client.cliRpc("listTemplates", {
    limit: options.limit,
  });
}

export async function createBookmark(
  client: BlahClient,
  _apiKey: string,
  args: {
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    note?: string;
  },
): Promise<{ bookmarkId: Id<"bookmarks"> }> {
  return client.cliRpc("createBookmark", {
    messageId: args.messageId,
    conversationId: args.conversationId,
    note: args.note,
  });
}

export async function listTasks(
  client: BlahClient,
  _apiKey: string,
  options: {
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    limit?: number;
  } = {},
): Promise<Task[] | null> {
  return client.cliRpc("listTasks", {
    status: options.status,
    limit: options.limit,
  });
}

export async function createTask(
  client: BlahClient,
  _apiKey: string,
  args: {
    title: string;
    description?: string;
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
    deadlineSource?: string;
    projectId?: Id<"projects">;
  },
): Promise<{ taskId: Id<"tasks"> }> {
  return client.cliRpc("createTask", {
    title: args.title,
    description: args.description,
    urgency: args.urgency,
    deadline: args.deadline,
    deadlineSource: args.deadlineSource,
    projectId: args.projectId,
  });
}

export async function updateTask(
  client: BlahClient,
  _apiKey: string,
  args: {
    taskId: Id<"tasks">;
    title?: string;
    description?: string;
    status?:
      | "suggested"
      | "confirmed"
      | "in_progress"
      | "completed"
      | "cancelled";
    urgency?: "low" | "medium" | "high" | "urgent";
    deadline?: number;
  },
): Promise<void> {
  await client.cliRpc("updateTask", {
    taskId: args.taskId,
    title: args.title,
    description: args.description,
    status: args.status,
    urgency: args.urgency,
    deadline: args.deadline,
  });
}

export async function completeTask(
  client: BlahClient,
  _apiKey: string,
  taskId: Id<"tasks">,
): Promise<void> {
  await client.cliRpc("completeTask", {
    taskId,
  });
}

export async function deleteTask(
  client: BlahClient,
  _apiKey: string,
  taskId: Id<"tasks">,
): Promise<void> {
  await client.cliRpc("deleteTask", {
    taskId,
  });
}

export async function listNotes(
  client: BlahClient,
  _apiKey: string,
  options: { limit?: number } = {},
): Promise<Note[] | null> {
  return client.cliRpc("listNotes", {
    limit: options.limit,
  });
}

export async function createNote(
  client: BlahClient,
  _apiKey: string,
  args: {
    content: string;
    title?: string;
    sourceMessageId?: Id<"messages">;
    sourceConversationId?: Id<"conversations">;
    projectId?: Id<"projects">;
  },
): Promise<{ noteId: Id<"notes"> }> {
  return client.cliRpc("createNote", {
    content: args.content,
    title: args.title,
    sourceMessageId: args.sourceMessageId,
    sourceConversationId: args.sourceConversationId,
    projectId: args.projectId,
  });
}

export async function updateNote(
  client: BlahClient,
  _apiKey: string,
  args: {
    noteId: Id<"notes">;
    title?: string;
    content?: string;
    isPinned?: boolean;
  },
): Promise<void> {
  await client.cliRpc("updateNote", {
    noteId: args.noteId,
    title: args.title,
    content: args.content,
    isPinned: args.isPinned,
  });
}

export async function deleteNote(
  client: BlahClient,
  _apiKey: string,
  noteId: Id<"notes">,
): Promise<void> {
  await client.cliRpc("deleteNote", {
    noteId,
  });
}
