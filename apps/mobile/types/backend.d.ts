// Type declaration for @blah-chat/backend
// This provides API types without requiring full backend type-checking

declare module "@blah-chat/backend/convex/_generated/api" {
  import type { FunctionReference } from "convex/server";

  // The api object is dynamically typed since the full type is complex
  // and requires backend-specific path resolution
  export const api: {
    conversations: {
      list: FunctionReference<
        "query",
        "public",
        Record<string, never>,
        unknown[]
      >;
      get: FunctionReference<"query", "public", { id: string }, unknown>;
      create: FunctionReference<
        "mutation",
        "public",
        Record<string, unknown>,
        unknown
      >;
      [key: string]: FunctionReference<
        "query" | "mutation" | "action",
        "public" | "internal",
        unknown,
        unknown
      >;
    };
    messages: {
      list: FunctionReference<
        "query",
        "public",
        { conversationId: string },
        unknown[]
      >;
      send: FunctionReference<
        "mutation",
        "public",
        Record<string, unknown>,
        unknown
      >;
      [key: string]: FunctionReference<
        "query" | "mutation" | "action",
        "public" | "internal",
        unknown,
        unknown
      >;
    };
    chat: {
      sendMessage: FunctionReference<
        "mutation",
        "public",
        {
          conversationId?: string;
          content: string;
          models?: string[];
          modelId?: string;
          thinkingEffort?: "none" | "low" | "medium" | "high";
        },
        { conversationId: string; messageId?: string }
      >;
      [key: string]: FunctionReference<
        "query" | "mutation" | "action",
        "public" | "internal",
        unknown,
        unknown
      >;
    };
    users: {
      [key: string]: FunctionReference<
        "query" | "mutation" | "action",
        "public" | "internal",
        unknown,
        unknown
      >;
    };
    [key: string]: {
      [key: string]: FunctionReference<
        "query" | "mutation" | "action",
        "public" | "internal",
        unknown,
        unknown
      >;
    };
  };
}

declare module "@blah-chat/backend/convex/_generated/dataModel" {
  export type Id<TableName extends string> = string & {
    __tableName: TableName;
  };

  // Base document type
  type BaseDoc = {
    _id: string;
    _creationTime: number;
  };

  // Specific document types
  type MessageDoc = BaseDoc & {
    conversationId: string;
    userId: string;
    role: "user" | "assistant" | "system";
    content: string;
    partialContent?: string;
    status: "pending" | "generating" | "complete" | "stopped" | "error";
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    error?: string;
    generationStartedAt?: number;
    generationCompletedAt?: number;
  };

  type ConversationDoc = BaseDoc & {
    userId: string;
    title: string;
    model: string;
    messageCount?: number;
    lastMessageAt: number;
    pinned: boolean;
    archived: boolean;
    starred: boolean;
  };

  // Conditional Doc type
  export type Doc<TableName extends string> = TableName extends "messages"
    ? MessageDoc
    : TableName extends "conversations"
      ? ConversationDoc
      : BaseDoc & { [key: string]: unknown };
}

// Convenience re-export at package root
declare module "@blah-chat/backend" {
  export type { Id, Doc } from "@blah-chat/backend/convex/_generated/dataModel";
  export { api } from "@blah-chat/backend/convex/_generated/api";
}
