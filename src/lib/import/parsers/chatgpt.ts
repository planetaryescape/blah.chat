import type { ImportResult } from "../types";

interface ChatGPTMessage {
  id: string;
  author: {
    role: "user" | "assistant" | "system";
  };
  content: {
    content_type: string;
    parts: string[];
  };
  create_time?: number;
}

interface ChatGPTConversation {
  title: string;
  create_time?: number;
  mapping: Record<string, ChatGPTMessage>;
}

export function parseChatGPT(content: string): ImportResult {
  try {
    const data = JSON.parse(content);

    // Support both single conversation and array of conversations
    const conversations: ChatGPTConversation[] = Array.isArray(data)
      ? data
      : [data];

    if (conversations.length === 0) {
      return {
        success: false,
        error: "No conversations found in ChatGPT export",
      };
    }

    // Transform ChatGPT format to import format
    const importConversations = conversations
      .map((conv) => {
        if (!conv.mapping || !conv.title) return null;

        // Extract messages from mapping
        const messages = Object.values(conv.mapping)
          .filter((msg) => msg.content?.parts?.length > 0)
          .map((msg) => ({
            role: msg.author.role,
            content: msg.content.parts.join("\n"),
            createdAt: msg.create_time ? msg.create_time * 1000 : undefined, // Convert to ms
          }))
          .filter((msg) => msg.content.trim().length > 0);

        if (messages.length === 0) return null;

        return {
          title: conv.title,
          messages,
          createdAt: conv.create_time ? conv.create_time * 1000 : undefined,
        };
      })
      .filter((conv): conv is NonNullable<typeof conv> => conv !== null);

    if (importConversations.length === 0) {
      return {
        success: false,
        error: "Failed to parse any valid conversations from ChatGPT export",
      };
    }

    const totalMessages = importConversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0,
    );

    return {
      success: true,
      data: {
        conversations: importConversations,
        format: "chatgpt",
      },
      conversationsCount: importConversations.length,
      messagesCount: totalMessages,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse ChatGPT export: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
