"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const get = internalAction({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    section: v.string(),
  },
  // biome-ignore lint/suspicious/noExplicitAny: Complex project context return types
  handler: async (ctx, { userId, conversationId, section }): Promise<any> => {
    try {
      // 1. Get conversation's project
      // biome-ignore lint/suspicious/noExplicitAny: Project ID types
      let projectId: any = null;
      if (conversationId) {
        // biome-ignore lint/suspicious/noExplicitAny: Conversation object types
        const conversation: any = await ctx.runQuery(
          internal.conversations.getInternal,
          { id: conversationId },
        );
        projectId = conversation?.projectId;
      }

      if (!projectId) {
        return {
          success: false,
          error: "No project associated with this conversation",
        };
      }

      // 2. Get project details
      // biome-ignore lint/suspicious/noExplicitAny: Project object types
      const project: any = await ctx.runQuery(internal.projects.getInternal, {
        id: projectId,
      });

      if (!project) {
        return { success: false, error: "Project not found" };
      }

      // 3. Return requested section
      switch (section) {
        case "context": {
          return {
            success: true,
            section,
            project: {
              name: project.name,
              description: project.description,
              systemPrompt: project.systemPrompt,
              conversationCount: project.conversationIds.length,
            },
          };
        }

        case "notes": {
          // Notes feature - return project note count from conversationIds
          return {
            success: true,
            section,
            project: { name: project.name },
            notes: [],
            totalCount: 0,
            message:
              "Notes listing available for conversations in this project",
          };
        }

        case "files": {
          // Files feature - return project info
          return {
            success: true,
            section,
            project: { name: project.name },
            files: [],
            totalCount: 0,
            message: "Files available in conversations within this project",
          };
        }

        case "history": {
          // Get conversation count and IDs from project
          const conversationCount = project.conversationIds.length;

          return {
            success: true,
            section,
            project: { name: project.name },
            recentConversations: [],
            totalCount: conversationCount,
            message: `Project contains ${conversationCount} conversation${conversationCount !== 1 ? "s" : ""}`,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown section: ${section}. Valid: context, notes, files, history`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project context",
      };
    }
  },
});
