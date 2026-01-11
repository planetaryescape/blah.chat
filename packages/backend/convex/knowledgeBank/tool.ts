/**
 * Knowledge Bank AI Tool
 *
 * Tool definition for AI to search the user's knowledge bank.
 */

import { tool } from "ai";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { logger } from "../lib/logger";
import type { KnowledgeSearchResult } from "./search";

/**
 * Create the searchKnowledgeBank tool for AI generation
 */
export function createSearchKnowledgeBankTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  projectId?: Id<"projects">,
) {
  return tool({
    description: `Search the user's personal knowledge bank. This contains documents, notes, web pages, and YouTube videos the user has saved for reference. Use this when:
- User asks about their saved documents or files
- User references their knowledge base or notes
- User asks about content from their uploaded PDFs, saved web pages, or YouTube videos
- You need to find specific information the user has stored`,
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query to find relevant knowledge. Be specific."),
      sourceTypes: z
        .array(z.enum(["file", "text", "web", "youtube"]))
        .optional()
        .describe(
          "Filter by source type. Options: file (PDFs/documents), text (pasted notes), web (web pages), youtube (video transcripts)",
        ),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe("Maximum results to return (1-10, default 5)"),
    }),
    execute: async ({ query, sourceTypes, limit }) => {
      const effectiveLimit = limit ?? 5;
      try {
        const results = (await (ctx.runAction as any)(
          // @ts-ignore
          internal.knowledgeBank.search.searchInternal,
          {
            userId,
            query,
            projectId,
            sourceTypes,
            limit: effectiveLimit,
          },
        )) as KnowledgeSearchResult[];

        if (results.length === 0) {
          return {
            found: 0,
            results: [],
            message:
              "No relevant knowledge found. The user may not have saved content on this topic.",
          };
        }

        // Format results for AI consumption
        const formattedResults = results.map((r, i) => ({
          index: i + 1,
          title: r.sourceTitle,
          type: r.sourceType,
          content: r.content,
          source: formatSource(r),
          relevance: `${Math.round(r.score * 100)}%`,
        }));

        return {
          found: results.length,
          results: formattedResults,
          message: `Found ${results.length} relevant result(s) from the user's knowledge bank.`,
        };
      } catch (error) {
        logger.error("Search error", {
          tag: "searchKnowledgeBank",
          error: String(error),
        });
        return {
          found: 0,
          results: [],
          message: "Failed to search knowledge bank. Please try again.",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
}

/**
 * Format source reference for display
 */
function formatSource(result: KnowledgeSearchResult): string {
  switch (result.sourceType) {
    case "youtube":
      if (result.timestamp) {
        return `YouTube: ${result.sourceUrl || "video"} @ ${result.timestamp}`;
      }
      return `YouTube: ${result.sourceUrl || "video"}`;

    case "web":
      return `Web: ${result.sourceUrl || "page"}`;

    case "file":
      if (result.pageNumber) {
        return `File: ${result.sourceTitle} (page ${result.pageNumber})`;
      }
      return `File: ${result.sourceTitle}`;

    case "text":
      return `Note: ${result.sourceTitle}`;

    default:
      return result.sourceTitle;
  }
}

/**
 * System prompt addition for knowledge bank awareness
 */
export function getKnowledgeBankSystemPrompt(hasKnowledge: boolean): string {
  if (!hasKnowledge) {
    return "";
  }

  return `

## Knowledge Bank
The user has a personal knowledge bank with saved documents, web pages, notes, and YouTube videos. Use the searchKnowledgeBank tool when:
- User asks about their saved content or references their knowledge base
- User mentions their documents, PDFs, or saved articles
- You need to find specific information the user has stored
- User asks about content from YouTube videos they've saved

The knowledge bank searches across:
- Files: PDFs and documents the user has uploaded
- Text: Notes and text snippets the user has pasted
- Web: Web pages the user has saved
- YouTube: Transcripts from saved YouTube videos

When citing knowledge bank results, reference the source (e.g., "According to your saved document 'Project Spec'..." or "From the YouTube video you saved...").
`;
}
