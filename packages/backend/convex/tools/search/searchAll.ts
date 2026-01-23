/**
 * Backend Action: Search All
 *
 * Unified search across files, notes, tasks, conversation history, and knowledge bank.
 * Searches knowledge bank FIRST for early return on high-quality results.
 * Merges results with RRF and optional LLM reranking.
 */

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { MEMORY_RERANK_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { internalAction } from "../../_generated/server";
import type { KnowledgeSearchResult } from "../../knowledgeBank/search";
import { LLM_OPERATION_TIMEOUT, withTimeout } from "../../lib/budgetTracker";
import { logger } from "../../lib/logger";
import { buildMemoryRerankPrompt } from "../../lib/prompts/operational/memoryRerank";
import {
  applyRRF,
  DEFAULT_SOURCE_WEIGHTS,
  getQualityLevel,
  type QualityResult,
} from "../../lib/utils/search";

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

/** Response type from searchAll action (used for recursive expansion calls) */
interface SearchAllResponse {
  success: boolean;
  results: UnifiedResult[];
  totalResults: number;
  quality: QualityResult;
  searchedSources: string[];
  earlyReturn: boolean;
  reranked?: boolean;
  expanded?: boolean;
  expandedQueries?: string[];
  summary?: string;
  message?: string;
}

// Unified result type for RRF merging
interface UnifiedResult {
  _id: string;
  source: string;
  score: number;
  content: string;
  title?: string;
  url?: string | null;
  [key: string]: unknown;
}

/**
 * Rerank search results using LLM (same pattern as memories/search.ts).
 */
async function rerankSearchResults(
  ctx: ActionCtx,
  userId: Id<"users">,
  query: string,
  results: UnifiedResult[],
  limit: number,
): Promise<UnifiedResult[]> {
  if (results.length <= limit) return results;

  // Take top 20 candidates for reranking
  const candidates = results.slice(0, 20);
  const items = candidates.map((r) => ({
    content: r.content || r.title || "",
  }));
  const prompt = buildMemoryRerankPrompt(query, items);

  try {
    const result = await withTimeout(
      generateText({
        model: getModel(MEMORY_RERANK_MODEL.id),
        prompt,
        temperature: 0,
        providerOptions: getGatewayOptions(MEMORY_RERANK_MODEL.id, undefined, [
          "search-rerank",
        ]),
      }),
      LLM_OPERATION_TIMEOUT,
      "search-rerank",
    );

    // Track usage
    if (result.usage) {
      const inputTokens = result.usage.inputTokens ?? 0;
      const outputTokens = result.usage.outputTokens ?? 0;
      const cost = calculateCost(MEMORY_RERANK_MODEL.id, {
        inputTokens,
        outputTokens,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordTextGeneration,
        {
          userId,
          model: MEMORY_RERANK_MODEL.id,
          inputTokens,
          outputTokens,
          cost,
          feature: "chat", // Search reranking is part of chat flow
        },
      );
    }

    // Parse indices (same pattern as rerankMemories)
    const indices = result.text
      .trim()
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((i) => !Number.isNaN(i) && i >= 0 && i < candidates.length);

    if (indices.length === 0) {
      logger.info("Failed to parse response, using original order", {
        tag: "Rerank",
      });
      return results.slice(0, limit);
    }

    return indices.slice(0, limit).map((i) => candidates[i]);
  } catch (error) {
    logger.error("Failed, using original order", {
      tag: "Rerank",
      error: String(error),
    });
    return results.slice(0, limit);
  }
}

/**
 * Escape user input for safe inclusion in LLM prompts.
 * Uses JSON.stringify to escape quotes and control characters.
 */
function escapeForPrompt(input: string): string {
  return JSON.stringify(input);
}

/**
 * Generate query variations for vocabulary mismatch.
 * Reuses MEMORY_RERANK_MODEL (same cost-effective model).
 */
async function expandQuery(
  query: string,
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<string[]> {
  const safeQuery = escapeForPrompt(query);
  const prompt = `Generate 3 alternative search queries for: ${safeQuery}
Use synonyms and related terms. Keep same intent.
One query per line, no numbering.`;

  try {
    const result = await withTimeout(
      generateText({
        model: getModel(MEMORY_RERANK_MODEL.id),
        prompt,
        temperature: 0.7,
        providerOptions: getGatewayOptions(MEMORY_RERANK_MODEL.id, undefined, [
          "search-expansion",
        ]),
      }),
      LLM_OPERATION_TIMEOUT,
      "search-expansion",
    );

    // Track cost (same pattern as reranking)
    if (result.usage) {
      const inputTokens = result.usage.inputTokens ?? 0;
      const outputTokens = result.usage.outputTokens ?? 0;
      const cost = calculateCost(MEMORY_RERANK_MODEL.id, {
        inputTokens,
        outputTokens,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.usage.mutations.recordTextGeneration,
        {
          userId,
          model: MEMORY_RERANK_MODEL.id,
          inputTokens,
          outputTokens,
          cost,
          feature: "chat", // Search expansion is part of chat flow
        },
      );
    }

    return result.text
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          l.length < 200 &&
          l.toLowerCase() !== query.toLowerCase(),
      )
      .slice(0, 3);
  } catch {
    return []; // Graceful degradation
  }
}

/**
 * Convert various result types to unified format for RRF merging.
 * Spread original result first, then override with unified fields.
 */
function toUnified(
  result:
    | FileResult
    | NoteResult
    | TaskResult
    | ConversationResult
    | KnowledgeSearchResult,
  source: string,
): UnifiedResult {
  // Handle KnowledgeSearchResult (has numeric score)
  if ("chunkId" in result) {
    return {
      ...result,
      _id: result.chunkId.toString(),
      source,
      score: result.score,
      content: result.content,
      title: result.sourceTitle,
      url: result.sourceUrl,
    };
  }

  // Handle other result types (have string score)
  const scoreNum = Number.parseFloat(
    (result as { score?: string }).score ?? "0",
  );

  if ("filename" in result) {
    // FileResult
    return {
      ...result,
      _id: result.id,
      source,
      score: scoreNum,
      content: result.content,
      title: result.filename,
      url: result.url,
    };
  }

  if ("preview" in result) {
    // NoteResult
    return {
      ...result,
      _id: result.id,
      source,
      score: scoreNum,
      content: result.preview,
      title: result.title,
      url: result.url,
    };
  }

  if ("conversationTitle" in result) {
    // ConversationResult
    return {
      ...result,
      _id: result.id,
      source,
      score: scoreNum,
      content: result.content,
      title: result.conversationTitle,
      url: result.url,
    };
  }

  // TaskResult
  return {
    ...result,
    _id: result.id,
    source,
    score: scoreNum,
    content: result.description ?? result.title,
    title: result.title,
    url: result.url,
  };
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
    enableExpansion: v.optional(v.boolean()),
    isExpanded: v.optional(v.boolean()), // Prevents infinite recursion
  },
  handler: async (ctx, args) => {
    const searchedSources: string[] = [];
    const allResults: UnifiedResult[] = [];

    // Get user feature toggles to filter out disabled features
    const featureToggles = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getFeatureToggles,
      { userId: args.userId },
    )) as { showTasks: boolean; showSmartAssistant: boolean };

    // Filter out disabled resource types
    let activeResourceTypes = args.resourceTypes;
    if (!featureToggles.showTasks) {
      activeResourceTypes = activeResourceTypes.filter((t) => t !== "tasks");
    }

    // 1. Search KB FIRST if included (knowledge-first strategy)
    if (activeResourceTypes.includes("knowledgeBank")) {
      const kbResults = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.knowledgeBank.search.searchInternal,
        {
          userId: args.userId,
          query: args.query,
          projectId: args.projectId,
          limit: args.limit * 2, // Fetch more for quality assessment
        },
      )) as KnowledgeSearchResult[];

      searchedSources.push("knowledgeBank");

      if (kbResults && kbResults.length > 0) {
        const tagged = kbResults.map((r) => toUnified(r, "knowledgeBank"));
        const quality = getQualityLevel(kbResults.map((r) => r.score));

        // Early return if KB has high quality results
        if (quality.level === "high" && kbResults.length >= args.limit) {
          return {
            success: true,
            results: tagged.slice(0, args.limit),
            totalResults: kbResults.length,
            quality,
            searchedSources,
            earlyReturn: true,
            summary: `Found ${kbResults.length} high-quality knowledge items`,
          };
        }

        allResults.push(...tagged);
      }
    }

    // 2. Search remaining types in parallel
    const remainingTypes = activeResourceTypes.filter(
      (t) => t !== "knowledgeBank",
    );
    const searchPromises: Promise<void>[] = [];

    if (remainingTypes.includes("files")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchFiles.searchFiles,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit * 2,
            },
          )) as SearchResponse<FileResult>;

          if (response.success && response.results.length > 0) {
            searchedSources.push("files");
            allResults.push(
              ...response.results.map((r) => toUnified(r, "files")),
            );
          }
        })(),
      );
    }

    if (remainingTypes.includes("notes")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchNotes.searchNotes,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit * 2,
            },
          )) as SearchResponse<NoteResult>;

          if (response.success && response.results.length > 0) {
            searchedSources.push("notes");
            allResults.push(
              ...response.results.map((r) => toUnified(r, "notes")),
            );
          }
        })(),
      );
    }

    if (remainingTypes.includes("tasks")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.searchTasks.searchTasks,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit * 2,
            },
          )) as SearchResponse<TaskResult>;

          if (response.success && response.results.length > 0) {
            searchedSources.push("tasks");
            allResults.push(
              ...response.results.map((r) => toUnified(r, "tasks")),
            );
          }
        })(),
      );
    }

    if (remainingTypes.includes("conversations")) {
      searchPromises.push(
        (async () => {
          const response = (await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.tools.search.queryHistory.queryHistory,
            {
              userId: args.userId,
              query: args.query,
              projectId: args.projectId,
              limit: args.limit * 2,
              includeCurrentConversation: false,
              currentConversationId: args.currentConversationId,
            },
          )) as SearchResponse<ConversationResult>;

          if (response.success && response.results.length > 0) {
            searchedSources.push("conversations");
            allResults.push(
              ...response.results.map((r) => toUnified(r, "conversations")),
            );
          }
        })(),
      );
    }

    await Promise.all(searchPromises);

    // 3. Handle no results
    if (allResults.length === 0) {
      return {
        success: true,
        results: [],
        totalResults: 0,
        quality: { level: "low" as const, topScore: 0 },
        searchedSources,
        earlyReturn: false,
        message: args.projectId
          ? "No matching results found in project"
          : "No matching results found",
      };
    }

    // 4. Merge with RRF (knowledge bank already weighted 1.5x via DEFAULT_SOURCE_WEIGHTS)
    let merged = applyRRF(allResults, [], 60, DEFAULT_SOURCE_WEIGHTS);
    let quality: QualityResult = getQualityLevel(merged.map((r) => r.score));
    let expanded = false;
    let expandedQueries: string[] = [];

    // 4.5. Query expansion for low-quality results
    if (
      quality.level === "low" &&
      args.enableExpansion !== false &&
      !args.isExpanded &&
      merged.length < 3
    ) {
      const variations = await expandQuery(args.query, ctx, args.userId);

      if (variations.length > 0) {
        // Search with variations (parallel, marked as expanded)
        const expandedSearches = variations.map((q) =>
          (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit
            internal.tools.search.searchAll.searchAll,
            {
              ...args,
              query: q,
              isExpanded: true,
              enableExpansion: false,
            },
          ),
        );
        const expandedResults = await Promise.all(expandedSearches);

        // Flatten and merge with RRF (original results weighted higher via position)
        const allExpanded = expandedResults.flatMap(
          (r: SearchAllResponse) => r.results || [],
        );
        merged = applyRRF(
          [...merged, ...allExpanded],
          [],
          60,
          DEFAULT_SOURCE_WEIGHTS,
        );

        // Recalculate quality
        quality = getQualityLevel(merged.map((r) => r.score));
        expanded = true;
        expandedQueries = variations;
      }
    }

    // 5. Rerank if quality not high and we have more results than limit
    let finalResults = merged.slice(0, args.limit);
    let reranked = false;

    if (quality.level !== "high" && merged.length > args.limit) {
      finalResults = await rerankSearchResults(
        ctx,
        args.userId,
        args.query,
        merged,
        args.limit,
      );
      reranked = true;
      // Recalculate quality after reranking
      quality = getQualityLevel(finalResults.map((r) => r.score));
    }

    // 6. Build summary
    const sourceCounts = searchedSources
      .map((s) => {
        const count = finalResults.filter((r) => r.source === s).length;
        return count > 0 ? `${count} ${s}` : null;
      })
      .filter(Boolean);

    return {
      success: true,
      results: finalResults,
      totalResults: allResults.length,
      quality,
      searchedSources,
      earlyReturn: false,
      reranked,
      expanded,
      expandedQueries,
      summary:
        sourceCounts.length > 0
          ? `Found ${sourceCounts.join(", ")}`
          : `Found ${finalResults.length} results`,
    };
  },
});
