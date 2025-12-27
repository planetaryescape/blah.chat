import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";

interface ChatGPTMessage {
  id: string;
  author: {
    role: "user" | "assistant" | "system";
  };
  content: {
    content_type: "text";
    parts: string[];
  };
  create_time: number;
}

interface ChatGPTConversation {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTMessage>;
  moderation_results: [];
  current_node: string;
}

export function exportToChatGPTFormat(
  conversations: Array<Doc<"conversations"> & { messages: Doc<"messages">[] }>,
): ChatGPTConversation[] {
  return conversations.map((conv: any) => {
    const mapping: Record<string, ChatGPTMessage> = {};
    let currentNode = "";

    // Convert messages to ChatGPT format
    conv.messages.forEach((msg: any, index: any) => {
      const id = msg._id.toString();
      if (index === conv.messages.length - 1) {
        currentNode = id;
      }

      mapping[id] = {
        id,
        author: {
          role: msg.role as "user" | "assistant" | "system",
        },
        content: {
          content_type: "text",
          parts: [msg.content],
        },
        create_time: msg.createdAt / 1000, // Convert to seconds
      };
    });

    return {
      title: conv.title,
      create_time: conv.createdAt / 1000,
      update_time: conv.updatedAt / 1000,
      mapping,
      moderation_results: [],
      current_node: currentNode,
    };
  });
}

export function generateChatGPTFilename(): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `blah-chat-chatgpt-export-${timestamp}.json`;
}
