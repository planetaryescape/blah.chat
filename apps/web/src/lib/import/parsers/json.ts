import type { ExportData } from "../../export/json";
import type { ImportResult } from "../types";

export function parseJSON(content: string): ImportResult {
  try {
    const data = JSON.parse(content) as ExportData;

    // Validate structure
    if (!data.version || !data.conversations) {
      return {
        success: false,
        error: "Invalid JSON format: missing required fields",
      };
    }

    // Transform to import format
    const conversations = data.conversations.map((conv) => ({
      title: conv.title,
      model: conv.model,
      systemPrompt: conv.systemPrompt,
      createdAt: conv.createdAt,
      messages: conv.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        model: msg.model,
      })),
    }));

    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0,
    );

    return {
      success: true,
      data: {
        conversations,
        format: "json",
      },
      conversationsCount: conversations.length,
      messagesCount: totalMessages,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
