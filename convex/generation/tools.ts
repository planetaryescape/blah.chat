"use node";

import { tavilySearch } from "@tavily/ai-sdk";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { createCalculatorTool } from "../ai/tools/calculator";
import { createCodeExecutionTool } from "../ai/tools/codeExecution";
import { createDocumentTool } from "../ai/tools/createDocument";
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

/**
 * Configuration for building AI tools
 */
export interface BuildToolsConfig {
  ctx: ActionCtx;
  userId: Id<"users">;
  conversationId: Id<"conversations">;
  messageAttachments?: Doc<"attachments">[];
  conversation?: {
    isIncognito?: boolean;
    incognitoSettings?: {
      enableReadTools?: boolean;
    };
    projectId?: Id<"projects">;
    mode?: string;
  } | null;
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
  const { ctx, userId, conversationId, messageAttachments, conversation } =
    config;

  // Incognito mode settings
  const isIncognito = conversation?.isIncognito ?? false;
  const incognitoSettings = conversation?.incognitoSettings;
  const enableReadTools =
    !isIncognito || incognitoSettings?.enableReadTools !== false;

  // Capability tools: ALWAYS available (stateless, no persistent writes)
  const calculatorTool = createCalculatorTool();
  const dateTimeTool = createDateTimeTool();
  const urlReaderTool = createUrlReaderTool(ctx);
  const fileDocumentTool = createFileDocumentTool(
    ctx,
    conversationId,
    messageAttachments,
  );
  const codeExecutionTool = createCodeExecutionTool(ctx);
  const weatherTool = createWeatherTool(ctx);

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
    datetime: dateTimeTool,
    tavilySearch: tavilySearchTool,
    tavilyAdvancedSearch: tavilyAdvancedSearchTool,
    urlReader: urlReaderTool,
    fileDocument: fileDocumentTool,
    codeExecution: codeExecutionTool,
    weather: weatherTool,
  };

  // Write tools: DISABLED for incognito (saveMemory, deleteMemory, manageTasks, canvas)
  if (!isIncognito) {
    const memorySaveTool = createMemorySaveTool(ctx, userId);
    const memoryDeleteTool = createMemoryDeleteTool(ctx, userId);
    const taskManagerTool = createTaskManagerTool(
      ctx,
      userId,
      conversation?.projectId,
    );
    tools.saveMemory = memorySaveTool;
    tools.deleteMemory = memoryDeleteTool;
    tools.manageTasks = taskManagerTool;

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
    const memorySearchTool = createMemorySearchTool(ctx, userId);
    const searchFilesTool = createSearchFilesTool(ctx, userId);
    const searchNotesTool = createSearchNotesTool(ctx, userId);
    const searchTasksTool = createSearchTasksTool(ctx, userId);
    const queryHistoryTool = createQueryHistoryTool(
      ctx,
      userId,
      conversationId,
    );
    const searchAllTool = createSearchAllTool(ctx, userId, conversationId);
    tools.searchMemories = memorySearchTool;
    tools.searchFiles = searchFilesTool;
    tools.searchNotes = searchNotesTool;
    tools.searchTasks = searchTasksTool;
    tools.queryHistory = queryHistoryTool;
    tools.searchAll = searchAllTool;
  }

  return tools;
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
