"use node";

import { tavilySearch } from "@tavily/ai-sdk";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { createAskForClarificationTool } from "../ai/tools/askForClarification";
import { createCalculatorTool } from "../ai/tools/calculator";
import { createCodeExecutionTool } from "../ai/tools/codeExecution";
import { createDocumentTool } from "../ai/tools/createDocument";
import { createCurrencyConverterTool } from "../ai/tools/currencyConverter";
import { createDateTimeTool } from "../ai/tools/datetime";
import {
  createEnterDocumentModeTool,
  createExitDocumentModeTool,
} from "../ai/tools/documentMode";
import { createFileDocumentTool } from "../ai/tools/fileDocument";
import {
  createMemoryDeleteTool,
  createMemorySaveTool,
  createMemorySearchTool,
} from "../ai/tools/memories";
import { createReadDocumentTool } from "../ai/tools/readDocument";
import { createResolveConflictTool } from "../ai/tools/resolveConflict";
import {
  createQueryHistoryTool,
  createSearchAllTool,
  createSearchFilesTool,
  createSearchNotesTool,
  createSearchTasksTool,
} from "../ai/tools/search";
import { createTaskManagerTool } from "../ai/tools/taskManager";
import { createUpdateDocumentTool } from "../ai/tools/updateDocument";
import { createUrlReaderTool } from "../ai/tools/urlReader";
import { createWeatherTool } from "../ai/tools/weather";
import { createYoutubeVideoTool } from "../ai/tools/youtubeVideo";
import { createSearchKnowledgeBankTool } from "../knowledgeBank/tool";
import type { BudgetState } from "../lib/budgetTracker";
import type { MemoryExtractionLevel } from "../lib/prompts/operational/memoryExtraction";

/**
 * Configuration for building AI tools
 */
export interface BuildToolsConfig {
  ctx: ActionCtx;
  userId: Id<"users">;
  conversationId: Id<"conversations">;
  messageAttachments?: Doc<"attachments">[];
  memoryExtractionLevel?: MemoryExtractionLevel;
  conversation?: {
    isIncognito?: boolean;
    incognitoSettings?: {
      enableReadTools?: boolean;
    };
    projectId?: Id<"projects">;
    mode?: string;
  } | null;
  /** Search result cache (cleared after each generation) */
  searchCache?: Map<string, unknown>;
  /** Budget state for tracking search patterns and diminishing returns */
  budgetState?: {
    current: BudgetState;
    update: (newState: BudgetState) => void;
  };
  /** Active Composio integrations for external service tools */
  composioConnections?: Doc<"composioConnections">[];
}

/**
 * Build tools for AI generation based on model capabilities and conversation settings
 *
 * Tool categories:
 * - Capability tools: Always available (stateless, no persistent writes)
 * - Write tools: Disabled for incognito mode
 * - Read tools: Configurable for incognito mode
 * - Document tools: Only in document mode
 */
export function buildTools(config: BuildToolsConfig): Record<string, unknown> {
  const {
    ctx,
    userId,
    conversationId,
    messageAttachments,
    memoryExtractionLevel = "moderate",
    conversation,
    searchCache,
    budgetState,
  } = config;

  // Incognito mode settings
  const isIncognito = conversation?.isIncognito ?? false;
  const incognitoSettings = conversation?.incognitoSettings;
  const enableReadTools =
    !isIncognito || incognitoSettings?.enableReadTools !== false;

  // Memory tool settings based on extraction level
  // none = no memory tools, passive+ = search tool available
  const enableMemoryWriteTools =
    !isIncognito && memoryExtractionLevel !== "none";
  const enableMemoryReadTools =
    enableReadTools && memoryExtractionLevel !== "none";

  // Capability tools: ALWAYS available (stateless, no persistent writes)
  const calculatorTool = createCalculatorTool();
  const currencyConverterTool = createCurrencyConverterTool();
  const dateTimeTool = createDateTimeTool();
  const urlReaderTool = createUrlReaderTool(ctx);
  const fileDocumentTool = createFileDocumentTool(
    ctx,
    conversationId,
    messageAttachments,
  );
  const codeExecutionTool = createCodeExecutionTool(ctx);
  const weatherTool = createWeatherTool(ctx);
  const youtubeVideoTool = createYoutubeVideoTool(ctx, userId);
  const askForClarificationTool = createAskForClarificationTool();

  // Create Tavily search tools with custom descriptions
  const tavilySearchTool = {
    ...tavilySearch({
      searchDepth: "basic",
      includeAnswer: true,
      maxResults: 3,
    }),
    description: `Quick web search for simple factual queries.

✅ USE FOR:
- Quick factual lookups (dates, names, simple facts)
- Current events and news headlines
- Single-topic queries with clear answers

❌ DO NOT USE FOR:
- Complex research or multi-faceted questions
- Technical deep dives

Faster and cheaper. Use this first for simple queries.`,
  };

  const tavilyAdvancedSearchTool = {
    ...tavilySearch({
      searchDepth: "advanced",
      includeAnswer: true,
      maxResults: 5,
    }),
    description: `Deep web search for comprehensive research.

✅ USE FOR:
- Complex or multi-faceted questions
- In-depth research requiring comprehensive results
- When basic search didn't provide enough detail

❌ DO NOT USE FOR:
- Simple factual lookups (use tavilySearch instead)

More thorough but slower. Use only when depth is needed.`,
  };

  // Start with capability tools
  const tools: Record<string, any> = {
    calculator: calculatorTool,
    currencyConverter: currencyConverterTool,
    datetime: dateTimeTool,
    tavilySearch: tavilySearchTool,
    tavilyAdvancedSearch: tavilyAdvancedSearchTool,
    urlReader: urlReaderTool,
    fileDocument: fileDocumentTool,
    codeExecution: codeExecutionTool,
    weather: weatherTool,
    youtubeVideo: youtubeVideoTool,
    askForClarification: askForClarificationTool,
  };

  // Write tools: DISABLED for incognito
  if (!isIncognito) {
    // Memory write tools: respect extraction level
    // - none: no memory tools
    // - passive+: saveMemory available
    // - moderate+: deleteMemory also available
    if (enableMemoryWriteTools) {
      tools.saveMemory = createMemorySaveTool(ctx, userId);
      // deleteMemory only for moderate+ (not passive)
      if (memoryExtractionLevel !== "passive") {
        tools.deleteMemory = createMemoryDeleteTool(ctx, userId);
      }
    }

    // Task manager: always available (not memory-related)
    tools.manageTasks = createTaskManagerTool(
      ctx,
      userId,
      conversation?.projectId,
    );

    // Canvas/Document mode tools
    const isDocumentMode = conversation?.mode === "document";

    // enterDocumentMode: Always available as entry point
    tools.enterDocumentMode = createEnterDocumentModeTool(ctx, conversationId);

    // Document tools: Only in document mode
    if (isDocumentMode) {
      tools.exitDocumentMode = createExitDocumentModeTool(ctx, conversationId);
      tools.createDocument = createDocumentTool(ctx, userId, conversationId);
      tools.updateDocument = createUpdateDocumentTool(
        ctx,
        userId,
        conversationId,
      );
      tools.readDocument = createReadDocumentTool(ctx, userId, conversationId);
      tools.resolveConflict = createResolveConflictTool(
        ctx,
        userId,
        conversationId,
      );
    }
  }

  // Read tools: Configurable for incognito (search user data)
  if (enableReadTools) {
    // Memory search: respects extraction level (moderate+ only)
    if (enableMemoryReadTools) {
      tools.searchMemories = createMemorySearchTool(ctx, userId);
    }

    // Other search tools: always available when read tools enabled
    tools.searchFiles = createSearchFilesTool(ctx, userId);
    tools.searchNotes = createSearchNotesTool(ctx, userId);
    tools.searchTasks = createSearchTasksTool(ctx, userId);
    tools.queryHistory = createQueryHistoryTool(ctx, userId, conversationId);
    tools.searchAll = createSearchAllTool(
      ctx,
      userId,
      conversationId,
      searchCache,
      budgetState,
    );

    // Knowledge Bank search: searches user's saved documents, web pages, videos
    tools.searchKnowledgeBank = createSearchKnowledgeBankTool(
      ctx,
      userId,
      conversation?.projectId,
    );
  }

  return tools;
}

/**
 * Result from buildToolsAsync including Composio integration info
 */
export interface BuildToolsResult {
  tools: Record<string, unknown>;
  /** Names of connected Composio integrations (for system prompt) */
  connectedApps: string[];
}

/**
 * Build tools with async Composio integrations
 *
 * Use this version when you need to include Composio tools from external services.
 * Falls back to synchronous buildTools when no Composio connections are provided.
 */
export async function buildToolsAsync(
  config: BuildToolsConfig,
): Promise<BuildToolsResult> {
  const { logger } = await import("../lib/logger");

  // Start with synchronous tools
  const tools = buildTools(config);
  let connectedApps: string[] = [];

  const { ctx, userId, conversation, composioConnections } = config;
  const isIncognito = conversation?.isIncognito ?? false;

  // Add Composio tools if not incognito and connections exist
  if (!isIncognito && composioConnections && composioConnections.length > 0) {
    try {
      const { createComposioTools } = await import("../composio/tools");
      const activeConnections = composioConnections.filter(
        (c) => c.status === "active",
      );

      if (activeConnections.length > 0) {
        const composioResult = await createComposioTools(ctx, {
          userId,
          connections: activeConnections,
        });
        Object.assign(tools, composioResult.tools);
        connectedApps = composioResult.connectedApps;
      }
    } catch (error) {
      logger.warn("Failed to create Composio tools", {
        tag: "Composio",
        error: String(error),
      });
    }
  }

  logger.info("Final tools built", {
    tag: "Composio",
    totalToolCount: Object.keys(tools).length,
  });

  return { tools, connectedApps };
}

/**
 * Create the onStepFinish callback for tracking tool calls
 * Note: Phase 2 will add immediate persistence here
 */
export function createOnStepFinish(): (step: any) => void {
  return (step: any) => {
    if (step.toolCalls && step.toolCalls.length > 0) {
      const _completedCalls = step.toolCalls.map((tc: any) => ({
        id: tc.toolCallId,
        name: tc.toolName,
        arguments: JSON.stringify(tc.input || tc.args),
        result: JSON.stringify(
          step.toolResults?.find((tr: any) => tr.toolCallId === tc.toolCallId)
            ?.result,
        ),
        timestamp: Date.now(),
      }));

      // Phase 2 will add immediate persistence here
    }
  };
}
