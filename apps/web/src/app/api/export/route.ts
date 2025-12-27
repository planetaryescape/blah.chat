import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
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

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const conversationId = searchParams.get("conversationId");

  try {
    // Get user from Convex
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    const user: any = await (convex.query as any)(api.users.getCurrentUser, {});
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
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
        return new NextResponse("Conversation not found", { status: 404 });
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
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Export failed", { status: 500 });
  }
}
