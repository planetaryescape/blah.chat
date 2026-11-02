import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import type { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
import {
  exportToChatGPTFormat,
  generateChatGPTFilename,
} from "@/lib/export/chatgpt";
import { exportToJSON, generateJSONFilename } from "@/lib/export/json";
import {
  exportAllToMarkdown,
  exportConversationToMarkdown,
  generateMarkdownFilename,
} from "@/lib/export/markdown";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

function exportError(message: string, status: number) {
  return NextResponse.json(formatErrorEntity(message), {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  try {
    const { userId, getToken } = await auth();
    const token = userId ? await getToken({ template: "convex" }) : null;
    if (!userId || !token) {
      return exportError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const conversationId = searchParams.get("conversationId");

    let convex: ConvexHttpClient;
    try {
      convex = getAuthenticatedConvexClient(token);
    } catch (error) {
      logger.error({ error }, "Missing NEXT_PUBLIC_CONVEX_URL");
      return exportError("Internal Server Error", 500);
    }

    // Get user from Convex
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    const user: any = await (convex.query as any)(api.users.getCurrentUser, {});
    if (!user) {
      return exportError("User not found", 404);
    }

    let content: string;
    let filename: string;
    let contentType: string;

    if (conversationId) {
      // Export single conversation
      const conversation = await convex.query(api.conversations.get, {
        conversationId: conversationId as Id<"conversations">,
      });
      if (!conversation) {
        return exportError("Conversation not found", 404);
      }

      const messages = await convex.query(api.messages.list, {
        conversationId: conversationId as Id<"conversations">,
      });

      if (format === "markdown") {
        content = exportConversationToMarkdown(conversation, messages);
        filename = generateMarkdownFilename(conversation.title);
        contentType = "text/markdown";
      } else {
        // JSON format
        const data = exportToJSON({
          conversations: [{ ...conversation, messages }],
          memories: [],
          projects: [],
          bookmarks: [],
          userId: user._id,
        });
        content = JSON.stringify(data, null, 2);
        filename = generateJSONFilename();
        contentType = "application/json";
      }
    } else {
      // Export all data
      const conversations = await convex.query(api.conversations.list, {});
      const memories = await convex.query(api.memories.listAll, {});
      const projects = await convex.query(api.projects.list, {});
      const bookmarks = await convex.query(api.bookmarks.list, {});

      // Get messages for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv: any) => {
          const messages = await convex.query(api.messages.list, {
            conversationId: conv._id,
          });
          return { ...conv, messages };
        }),
      );

      if (format === "markdown") {
        content = exportAllToMarkdown(conversationsWithMessages);
        filename = generateMarkdownFilename();
        contentType = "text/markdown";
      } else if (format === "chatgpt") {
        const chatgptData = exportToChatGPTFormat(conversationsWithMessages);
        content = JSON.stringify(chatgptData, null, 2);
        filename = generateChatGPTFilename();
        contentType = "application/json";
      } else {
        // Default JSON format
        const data = exportToJSON({
          conversations: conversationsWithMessages,
          memories,
          projects,
          bookmarks,
          userId: user._id,
        });
        content = JSON.stringify(data, null, 2);
        filename = generateJSONFilename();
        contentType = "application/json";
      }
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Export failed",
    );
    return exportError("Export failed", 500);
  }
}
