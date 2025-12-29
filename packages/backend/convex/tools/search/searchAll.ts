/**
 * Backend Action: Search All
 *
 * Unified search across files, notes, tasks, conversation history, and knowledge bank.
 * Runs parallel searches and merges results with source attribution.
 */

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import type { KnowledgeSearchResult } from "../../knowledgeBank/search";

// Result types for each resource (includes IDs and URLs for navigation)
interface FileResult {
  id: string;
  fileId: string;
  projectId: string | null;
  filename: string;
  content: string;
  score: string;
  page?: number;
  url: string | null;
}

interface NoteResult {
  id: string;
  projectId: string | null;
  title: string;
  preview: string;
  tags: string[];
  score: string;
  updatedAt: string;
  url: string;
}

interface TaskResult {
  id: string;
  projectId: string | null;
  title: string;
  status: string;
  urgency: string;
  deadline: string | null;
  description?: string;
  score?: string;
  url: string;
}

interface ConversationResult {
  id: string;
  conversationId: string;
  conversationTitle: string;
  role: string;
  content: string;
  timestamp: string;
  score: string;
  url: string;
}

interface SearchResponse<T> {
  success: boolean;
  results: T[];
  message?: string;
  totalResults?: number;
}

export const searchAll = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
    projectId: v.optional(v.id("projects")),
    resourceTypes: v.array(
      v.union(
        v.literal("files"),
        v.literal("notes"),
        v.literal("tasks"),
        v.literal("conversations"),
        v.literal("knowledgeBank"),
      ),
    ),
    limit: v.number(),
    currentConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const results: {
      files?: { results: FileResult[]; totalResults: number };
      notes?: { results: NoteResult[]; totalResults: number };
      tasks?: { results: TaskResult[]; totalResults: number };
      conversations?: { results: ConversationResult[]; totalResults: number };
      knowledgeBank?: {
        results: KnowledgeSearchResult[];
        totalResults: number;
      };
    } = {};

    // Run searches in parallel for enabled resource types
    const searchPromises: Promise<void>[] = [];

    if (args.resourceTypes.includes("files")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchFiles.searchFiles,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit,
            },
          )) as SearchResponse<FileResult>;

          if (response.success && response.results.length > 0) {
            results.files = {
              results: response.results,
              totalResults: response.totalResults || response.results.length,
            };
          }
        })(),
      );
    }

    if (args.resourceTypes.includes("notes")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchNotes.searchNotes,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit,
            },
          )) as SearchResponse<NoteResult>;

          if (response.success && response.results.length > 0) {
            results.notes = {
              results: response.results,
              totalResults: response.totalResults || response.results.length,
            };
          }
        })(),
      );
    }

    if (args.resourceTypes.includes("tasks")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchTasks.searchTasks,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit,
            },
          )) as SearchResponse<TaskResult>;

          if (response.success && response.results.length > 0) {
            results.tasks = {
              results: response.results,
              totalResults: response.totalResults || response.results.length,
            };
          }
        })(),
      );
    }

    if (args.resourceTypes.includes("conversations")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.queryHistory.queryHistory,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit,
              includeCurrentConversation: false,
              currentConversationId: args.currentConversationId,
            },
          )) as SearchResponse<ConversationResult>;

          if (response.success && response.results.length > 0) {
            results.conversations = {
              results: response.results,
              totalResults: response.totalResults || response.results.length,
            };
          }
        })(),
      );
    }

    if (args.resourceTypes.includes("knowledgeBank")) {
      searchPromises.push(
        (async () => {
          const kbResults = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.knowledgeBank.search.searchInternal,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit,
            },
          )) as KnowledgeSearchResult[];

          if (kbResults && kbResults.length > 0) {
            results.knowledgeBank = {
              results: kbResults,
              totalResults: kbResults.length,
            };
          }
        })(),
      );
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    // Calculate total results across all types
    const totalResults =
      (results.files?.totalResults || 0) +
      (results.notes?.totalResults || 0) +
      (results.tasks?.totalResults || 0) +
      (results.conversations?.totalResults || 0) +
      (results.knowledgeBank?.totalResults || 0);

    // Build summary message
    const foundTypes: string[] = [];
    if (results.knowledgeBank)
      foundTypes.push(`${results.knowledgeBank.totalResults} knowledge items`);
    if (results.files) foundTypes.push(`${results.files.totalResults} files`);
    if (results.notes) foundTypes.push(`${results.notes.totalResults} notes`);
    if (results.tasks) foundTypes.push(`${results.tasks.totalResults} tasks`);
    if (results.conversations)
      foundTypes.push(`${results.conversations.totalResults} conversations`);

    if (totalResults === 0) {
      return {
        success: true,
        results: {},
        totalResults: 0,
        message: args.projectId
          ? "No matching results found in project"
          : "No matching results found",
      };
    }

    return {
      success: true,
      results,
      totalResults,
      summary: `Found ${foundTypes.join(", ")}`,
    };
  },
});
