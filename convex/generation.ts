"use node";

import { getGatewayOptions } from "@/lib/ai/gateway";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { getModel } from "@/lib/ai/registry";
import {
  calculateCost,
  getModelConfig,
  type ModelConfig,
} from "@/lib/ai/utils";
import { type CoreMessage, generateText, stepCountIs, streamText } from "ai";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, type ActionCtx, internalAction } from "./_generated/server";
import { createCalculatorTool } from "./ai/tools/calculator";
import { createCodeExecutionTool } from "./ai/tools/codeExecution";
import { createDateTimeTool } from "./ai/tools/datetime";
import { createFileDocumentTool } from "./ai/tools/fileDocument";
import {
  createMemoryDeleteTool,
  createMemorySaveTool,
  createMemorySearchTool,
} from "./ai/tools/memories";
import {
  createQueryHistoryTool,
  createSearchAllTool,
  createSearchFilesTool,
  createSearchNotesTool,
  createSearchTasksTool,
} from "./ai/tools/search";
import { createTaskManagerTool } from "./ai/tools/taskManager";
import { createUrlReaderTool } from "./ai/tools/urlReader";
import { createWeatherTool } from "./ai/tools/weather";
import { createWebSearchTool } from "./ai/tools/webSearch";
import { trackServerEvent } from "./lib/analytics";
import {
  captureException,
  classifyStreamingError,
  estimateWastedCost,
} from "./lib/errorTracking";
import { getBasePrompt } from "./lib/prompts/base";
import {
  formatMemoriesByCategory,
  truncateMemories,
} from "./lib/prompts/formatting";
import {
  buildSummarizationPrompt,
  SUMMARIZATION_SYSTEM_PROMPT,
} from "./lib/prompts/operational/summarization";
import { calculateConversationTokensAsync } from "./tokens/counting";

export * as image from "./generation/image";

// Helper to download attachment and convert to base64
async function downloadAttachment(
  ctx: ActionCtx,
  storageId: string,
): Promise<string> {
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Failed to get storage URL");

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  // Convert ArrayBuffer to base64 (Convex-compatible)
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return base64;
}

// Helper to detect "out of credits" errors from API providers
// biome-ignore lint/suspicious/noExplicitAny: Error handling with unknown API error types
function detectCreditsError(error: any): boolean {
  const errorStr = String(error.message || error).toLowerCase();

  // Check status codes
  const hasPaymentStatusCode =
    error.status === 402 || // Payment Required
    error.status === 429; // Too Many Requests (rate limit)

  // Check error message keywords
  const hasCreditKeywords =
    errorStr.includes("credit") ||
    errorStr.includes("quota") ||
    errorStr.includes("limit exceeded") ||
    errorStr.includes("insufficient") ||
    errorStr.includes("balance") ||
    errorStr.includes("exceeded your");

  // Combine both signals
  return hasPaymentStatusCode || hasCreditKeywords;
}

// Helper function to build system prompts from multiple sources
// ORDER MATTERS: Later messages have higher effective priority (recency bias in LLMs)
// Structure: Base (foundation) → Context → User Preferences (highest priority, last)
async function buildSystemPrompts(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    conversationId: Id<"conversations">;
    userMessage: string;
    modelConfig: ModelConfig;
    hasFunctionCalling: boolean;
    prefetchedMemories: string | null;
  },
): Promise<{ messages: CoreMessage[]; memoryContent: string | null }> {
  const systemMessages: CoreMessage[] = [];
  let memoryContentForTracking: string | null = null;

  // Parallelize context queries (user, project, conversation)
  const [user, conversation] = (await Promise.all([
    // @ts-ignore - TypeScript recursion limit with helper queries
    ctx.runQuery(internal.lib.helpers.getCurrentUser, {}),
    // @ts-ignore - TypeScript recursion limit with helper queries
    ctx.runQuery(internal.lib.helpers.getConversation, {
      id: args.conversationId,
    }),
  ])) as [Doc<"users"> | null, Doc<"conversations"> | null];

  // Incognito blank slate: skip custom instructions and memories when configured
  const isBlankSlate =
    conversation?.isIncognito &&
    conversation?.incognitoSettings?.applyCustomInstructions === false;

  // Load custom instructions early (needed for base prompt conditional tone)
  // Phase 4: Load from new preference system
  const customInstructions = user
    ? await ctx.runQuery(
        // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
        api.users.getUserPreference,
        {
          key: "customInstructions",
        },
      )
    : null;

  // === 1. BASE IDENTITY (foundation) ===
  // Comes first to establish baseline behavior, which user preferences can override
  const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  const basePromptOptions = {
    modelConfig: args.modelConfig,
    hasFunctionCalling: args.hasFunctionCalling,
    prefetchedMemories: args.prefetchedMemories,
    currentDate,
    customInstructions: customInstructions, // Pass to conditionally modify tone section
  };
  const basePrompt = getBasePrompt(basePromptOptions);

  systemMessages.push({
    role: "system",
    content: basePrompt,
  });

  // === 2. IDENTITY MEMORIES ===
  // Skip for incognito blank slate mode
  if (!isBlankSlate) {
    try {
      const identityMemories: Doc<"memories">[] = await ctx.runQuery(
        internal.memories.search.getIdentityMemories,
        {
          userId: args.userId,
          limit: 20,
        },
      );

      if (identityMemories.length > 0) {
        // Calculate 10% budget for identity memories (conservative)
        const maxMemoryTokens = Math.floor(
          args.modelConfig.contextWindow * 0.1,
        );

        // Truncate by priority
        const truncated = truncateMemories(identityMemories, maxMemoryTokens);

        memoryContentForTracking = formatMemoriesByCategory(truncated);

        if (memoryContentForTracking) {
          systemMessages.push({
            role: "system",
            content: `## Identity & Preferences\n\n${memoryContentForTracking}`,
          });
        }
      }
    } catch (error) {
      console.error("[Identity] Failed to load identity memories:", error);
      // Continue without memories (graceful degradation)
    }
  }

  // === 3. CONTEXTUAL MEMORIES (for non-tool models only) ===
  // Skip for incognito blank slate mode
  if (args.prefetchedMemories && !isBlankSlate) {
    systemMessages.push({
      role: "system",
      content: `## Contextual Memories\n\n${args.prefetchedMemories}`,
    });
  }

  // === 4. PROJECT CONTEXT ===
  if (conversation?.projectId) {
    const project: Doc<"projects"> | null = await ctx.runQuery(
      internal.lib.helpers.getProject,
      {
        id: conversation.projectId,
      },
    );
    if (project?.systemPrompt) {
      systemMessages.push({
        role: "system",
        content: `## Project Context\n${project.systemPrompt}`,
      });
    }
  }

  // === 5. CONVERSATION-LEVEL SYSTEM PROMPT ===
  if (conversation?.systemPrompt) {
    systemMessages.push({
      role: "system",
      content: `## Conversation Instructions\n${conversation.systemPrompt}`,
    });
  }

  // === 6. USER CUSTOM INSTRUCTIONS (HIGHEST PRIORITY - LAST) ===
  // Placed last to leverage recency bias in LLMs
  // Wrapped with explicit override directive
  // Skip for incognito blank slate mode
  if (customInstructions?.enabled && !isBlankSlate) {
    const {
      aboutUser,
      responseStyle,
      baseStyleAndTone,
      nickname,
      occupation,
      moreAboutYou,
    } = customInstructions;

    // Build personalization sections
    const sections: string[] = [];

    // User identity section
    const identityParts: string[] = [];
    if (nickname) identityParts.push(`Name: ${nickname}`);
    if (occupation) identityParts.push(`Role: ${occupation}`);
    if (identityParts.length > 0) {
      sections.push(`### User Identity\n${identityParts.join("\n")}`);
    }

    // About the user
    if (aboutUser || moreAboutYou) {
      const aboutSections: string[] = [];
      if (aboutUser) aboutSections.push(aboutUser);
      if (moreAboutYou) aboutSections.push(moreAboutYou);
      sections.push(`### About the User\n${aboutSections.join("\n\n")}`);
    }

    // Response style (custom instructions from user)
    if (responseStyle) {
      sections.push(`### Response Style Instructions\n${responseStyle}`);
    }

    // Base style and tone directive
    if (baseStyleAndTone && baseStyleAndTone !== "default") {
      const toneDescriptions: Record<string, string> = {
        professional:
          "Be polished and precise. Use formal language and structured responses.",
        friendly:
          "Be warm and chatty. Use casual language and show enthusiasm.",
        candid:
          "Be direct and encouraging. Get straight to the point while being supportive.",
        quirky:
          "Be playful and imaginative. Use creative language and unexpected analogies.",
        efficient: "Be concise and plain. Minimize words, maximize clarity.",
        nerdy:
          "Be exploratory and enthusiastic. Dive deep into technical details.",
        cynical:
          "Be critical and sarcastic. Question assumptions, use dry humor.",
      };
      const toneDirective = toneDescriptions[baseStyleAndTone];
      if (toneDirective) {
        sections.push(`### Tone Directive\n${toneDirective}`);
      }
    }

    if (sections.length > 0) {
      // Wrap with explicit override directive for maximum priority
      const userPreferencesContent = `<user_preferences priority="highest">
## User Personalization Settings
**IMPORTANT**: These are the user's explicitly configured preferences. They take absolute priority over any default behavior or tone guidelines defined earlier.

${sections.join("\n\n")}

**Reminder**: Always honor these preferences. The user has specifically configured these settings.
</user_preferences>`;

      systemMessages.push({
        role: "system",
        content: userPreferencesContent,
      });
    }
  }

  return { messages: systemMessages, memoryContent: memoryContentForTracking };
}

// Helper function to extract sources/citations from AI SDK response
// Perplexity models (via OpenRouter) return search results in metadata
// Helper function to extract sources/citations from AI SDK response
// Perplexity models (via OpenRouter) return search results in metadata
// biome-ignore lint/suspicious/noExplicitAny: Complex provider metadata types from AI SDK
function extractSources(providerMetadata: any):
  | Array<{
      position: number;
      title: string;
      url: string;
      publishedDate?: string;
      snippet?: string;
    }>
  | undefined {
  if (!providerMetadata) return undefined;

  try {
    const allSources: Array<{
      title: string;
      url: string;
      snippet?: string;
      publishedDate?: string;
    }> = [];

    const openRouterMeta = providerMetadata.openrouter || providerMetadata;
    const perplexityMeta = providerMetadata.perplexity || providerMetadata;

    // 1. OpenRouter / Perplexity search_results format
    if (
      Array.isArray(openRouterMeta?.search_results) &&
      openRouterMeta.search_results.length > 0
    ) {
      allSources.push(
        ...openRouterMeta.search_results.map((r: any) => ({
          title: r.title || r.name || "Untitled Source",
          url: r.url,
          publishedDate: r.date || r.published_date,
          snippet: r.snippet || r.description,
        })),
      );
    }

    // 2. Perplexity Native citations
    const perplexitySources = perplexityMeta?.citations;
    if (Array.isArray(perplexitySources) && perplexitySources.length > 0) {
      const mapped = perplexitySources
        .map((r: any) => {
          if (typeof r === "string") {
            return {
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            title: r.title || "Untitled Source",
            url: r.url,
            snippet: r.snippet,
            publishedDate: undefined,
          };
        })
        .filter((s) => s.url);
      allSources.push(...mapped);
    }

    // 3. Generic citations/sources - FIXED: explicit array checks, no OR-chain
    const potentialSources = [
      openRouterMeta?.citations,
      openRouterMeta?.sources,
      providerMetadata?.citations,
      providerMetadata?.sources,
      (providerMetadata as any)?.extra?.citations,
    ].filter((arr) => Array.isArray(arr) && arr.length > 0);

    for (const sourceArray of potentialSources) {
      const mapped = sourceArray
        .map((r: any) => {
          if (typeof r === "string") {
            return {
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            title: r.title || r.name || "Untitled Source",
            url: r.url || r.uri || "",
            publishedDate: r.date || r.published_date,
            snippet: r.snippet || r.description,
          };
        })
        .filter((s: any) => s.url && s.url.length > 0);
      allSources.push(...mapped);
    }

    if (allSources.length === 0) return undefined;

    // Deduplicate by URL (case-insensitive, trimmed)
    const seenUrls = new Set<string>();
    const deduped = allSources.filter((s) => {
      const normalizedUrl = s.url.toLowerCase().trim();
      if (seenUrls.has(normalizedUrl)) return false;
      seenUrls.add(normalizedUrl);
      return true;
    });

    // Assign sequential positions for citation markers AFTER deduplication
    return deduped.map((s, i) => ({
      position: i + 1,
      title: s.title,
      url: s.url,
      publishedDate: s.publishedDate,
      snippet: s.snippet,
    }));
  } catch (error) {
    console.warn("[Sources] Failed to extract sources:", error);
    return undefined;
  }
}

/**
 * Extract sources from webSearch tool calls
 * @param allToolCalls - Array of finalized tool calls from buffer
 * @param startPosition - Offset for unified numbering (Perplexity source count)
 * @returns Array of sources with pre-computed positions for unified numbering
 */
function extractWebSearchSources(
  allToolCalls: Array<{ id: string; name: string; result?: string }>,
  startPosition: number,
): Array<{
  position: number;
  title: string;
  url: string;
  snippet?: string;
}> {
  const webSearchSources: Array<{
    position: number;
    title: string;
    url: string;
    snippet?: string;
  }> = [];

  for (const tc of allToolCalls) {
    // Only process webSearch tool calls with results
    if (tc.name !== "webSearch" || !tc.result) continue;

    try {
      const result = JSON.parse(tc.result);

      // Validate webSearch result structure
      if (!result.success || !Array.isArray(result.results)) continue;

      // Extract each result as a source
      for (const item of result.results) {
        if (!item.url) continue; // Skip results without URLs

        webSearchSources.push({
          position: startPosition + webSearchSources.length + 1,
          title: item.title || item.url, // Fallback to URL if no title
          url: item.url,
          snippet: item.content?.substring(0, 500), // Truncate long snippets
        });
      }
    } catch (e) {
      console.warn(
        `[WebSearch] Failed to parse result for tool call ${tc.id}:`,
        e,
      );
      // Continue processing other tool calls
    }
  }

  return webSearchSources;
}

export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    modelId: v.string(),
    userId: v.id("users"),
    thinkingEffort: v.optional(
      v.union(
        v.literal("none"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
    ),
    systemPromptOverride: v.optional(v.string()), // For consolidation
  },
  handler: async (ctx, args) => {
    // Timing variables for performance metrics
    const generationStartTime = Date.now();
    let firstTokenTime: number | undefined;

    try {
      // Check message status to detect resilient generation (resumed after refresh)
      const message = await ctx.runQuery(internal.messages.get, {
        messageId: args.assistantMessageId,
      });
      const wasAlreadyGenerating = message?.status === "generating";
      const isResumedAfterRefresh =
        wasAlreadyGenerating && message?.partialContent;

      // 1. Mark generation started
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId: args.assistantMessageId,
        partialContent: "",
      });

      // Set generation started timestamp
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.assistantMessageId,
        status: "generating",
        generationStartedAt: generationStartTime,
      });

      // Track streaming started or resumed
      if (isResumedAfterRefresh) {
        await trackServerEvent(
          "generation_resumed_after_refresh",
          {
            model: args.modelId,
            messageId: args.assistantMessageId,
            conversationId: args.conversationId,
            partialContentLength: message.partialContent?.length || 0,
          },
          args.userId,
        );
      } else {
        await trackServerEvent(
          "message_streaming_started",
          {
            model: args.modelId,
            messageId: args.assistantMessageId,
            conversationId: args.conversationId,
          },
          args.userId,
        );
      }

      // 2. Get conversation history
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // 2.5 Check if trying to switch to a Gemini thought-signature model mid-conversation
      const requiresThoughtSignature =
        args.modelId.includes("gemini-3-pro-image");
      if (requiresThoughtSignature && messages.length > 1) {
        // Check if conversation started with a compatible model
        const firstAssistantMsg = messages.find(
          (m: Doc<"messages">) => m.role === "assistant" && m.model,
        );
        const conversationStartedWithGeminiImage =
          firstAssistantMsg?.model?.includes("gemini-3-pro-image");

        if (!conversationStartedWithGeminiImage) {
          throw new Error(
            "MODEL_SWITCH_NOT_ALLOWED: Gemini 3 Pro Image cannot be used mid-conversation because it requires special message formatting. Please start a new chat to use this model.",
          );
        }
      }

      // 3. Get last user message for memory retrieval and attachments
      const lastUserMsg = messages
        .filter((m: Doc<"messages">) => m.role === "user")
        .sort(
          (a: Doc<"messages">, b: Doc<"messages">) => b.createdAt - a.createdAt,
        )[0];

      // Extract attachments from last user message for file processing tool
      const messageAttachments = lastUserMsg
        ? await ctx.runQuery(internal.lib.helpers.getMessageAttachments, {
            messageId: lastUserMsg._id,
          })
        : undefined;

      // 4. Get model config
      const modelConfig = getModelConfig(args.modelId);
      if (!modelConfig) {
        throw new Error(`Model ${args.modelId} not found in configuration`);
      }

      // 5. Check for vision and function-calling capabilities
      const hasVision = modelConfig.capabilities?.includes("vision") ?? false;
      const hasFunctionCalling =
        modelConfig.capabilities?.includes("function-calling") ?? false;

      // 6. Pre-fetch contextual memories for non-tool models
      let prefetchedMemories: string | null = null;

      if (!hasFunctionCalling && lastUserMsg) {
        try {
          // Build search query from last user message (content is a string)
          const searchQuery = (lastUserMsg.content || "").slice(0, 500); // Cap query length

          if (searchQuery.trim()) {
            // Search all non-identity categories
            const searchResults = await ctx.runAction(
              internal.memories.search.hybridSearch,
              {
                userId: args.userId,
                query: searchQuery,
                limit: 15, // Higher than tool default (5) since this is all they get
                // No category filter = search all
              },
            );

            // Filter out identity memories (already loaded separately)
            const contextMemories = searchResults.filter(
              (m: { metadata?: { category?: string } }) =>
                !["identity", "preference", "relationship"].includes(
                  m.metadata?.category ?? "",
                ),
            );

            if (contextMemories.length > 0) {
              // Format for system prompt injection
              const memoryTokenBudget = Math.floor(
                modelConfig.contextWindow * 0.15,
              );
              const memoryCharBudget = memoryTokenBudget * 4;

              let formatted = contextMemories
                .map(
                  (m: {
                    metadata?: { category?: string };
                    _creationTime: number;
                    content: string;
                  }) => {
                    const cat = m.metadata?.category || "general";
                    const timestamp = new Date(
                      m._creationTime,
                    ).toLocaleDateString();
                    return `[${cat}] (${timestamp}) ${m.content}`;
                  },
                )
                .join("\n\n");

              // Truncate if exceeds budget
              if (formatted.length > memoryCharBudget) {
                formatted =
                  formatted.slice(0, memoryCharBudget) +
                  "\n\n[...truncated for token limit]";
              }

              prefetchedMemories = formatted;
            }
          }
        } catch (error) {
          console.error("[Memory Pre-fetch] Failed:", error);
          // Continue without memories - don't block generation
        }
      }

      // 7. Build system prompts (or use override for consolidation)
      const systemPromptsResult = args.systemPromptOverride
        ? {
            messages: [
              { role: "system" as const, content: args.systemPromptOverride },
            ],
            memoryContent: null,
          }
        : await buildSystemPrompts(ctx, {
            userId: args.userId,
            conversationId: args.conversationId,
            userMessage: lastUserMsg?.content || "",
            modelConfig,
            hasFunctionCalling,
            prefetchedMemories,
          });

      const systemPrompts = systemPromptsResult.messages;
      const memoryContentForTracking = systemPromptsResult.memoryContent;

      // 7. Filter and transform conversation history (with attachments if vision model)
      const history = await Promise.all(
        messages
          .filter(
            (m: Doc<"messages">) =>
              m._id !== args.assistantMessageId && m.status === "complete",
          )
          .map(async (m: Doc<"messages">) => {
            // Query attachments for this message
            const attachments = await ctx.runQuery(
              internal.lib.helpers.getMessageAttachments,
              { messageId: m._id },
            );

            // Text-only messages (no attachments)
            if (!attachments || attachments.length === 0) {
              return {
                role: m.role as "user" | "assistant" | "system",
                content: m.content || "",
                providerMetadata: m.providerMetadata,
              };
            }

            // Build attachment metadata info for ALL models (so they know to use fileDocument tool)
            const attachmentInfo = attachments
              .map(
                (a: Doc<"attachments">, i: number) =>
                  `[Attached file ${i}: ${a.name} (${a.mimeType}, ${Math.round(a.size / 1024)}KB)]`,
              )
              .join("\n");

            // Messages with attachments - non-vision models get text + metadata info
            if (!hasVision) {
              // Non-vision models: append attachment metadata so AI knows to call fileDocument
              const content = `${m.content || ""}\n\n${attachmentInfo}`;
              return {
                role: m.role as "user" | "assistant" | "system",
                content,
                providerMetadata: m.providerMetadata,
              };
            }

            // Vision models: build content array with text + metadata + actual file data
            // biome-ignore lint/suspicious/noExplicitAny: Complex content parts for vision models
            const contentParts: any[] = [
              { type: "text", text: `${m.content || ""}\n\n${attachmentInfo}` },
            ];

            for (const attachment of attachments) {
              const base64 = await downloadAttachment(
                ctx,
                attachment.storageId,
              );

              if (attachment.type === "image") {
                contentParts.push({
                  type: "image",
                  image: base64,
                });
              } else if (attachment.type === "file") {
                // PDFs are the only document type supported as inline blobs by Gemini
                if (attachment.mimeType === "application/pdf") {
                  contentParts.push({
                    type: "file",
                    data: base64,
                    mediaType: attachment.mimeType,
                    filename: attachment.name,
                  });
                } else {
                  // For other file types (PPTX, DOCX, etc.), we rely on the fileDocument tool
                  // to extract text. We do NOT send the raw blob to the model as it causes 400 errors.
                  // The text content is already in the message or will be extracted.
                  // We add a text hint to the content parts.
                  contentParts.push({
                    type: "text",
                    text: `\n[Reference: ${attachment.name} (${attachment.mimeType})]`,
                  });
                }
              }
              // Future: audio support
            }

            return {
              role: m.role as "user" | "assistant" | "system",
              content: contentParts,
              providerMetadata: m.providerMetadata,
            };
          }),
      );

      // 7. Combine: system prompts FIRST, then history
      // Filter out empty messages (Gemini requires non-empty content parts)
      const nonEmptyHistory = history.filter((msg: any) => {
        if (Array.isArray(msg.content)) {
          return msg.content.length > 0;
        }
        return msg.content && msg.content.trim().length > 0;
      });

      // Clean providerMetadata for cross-model compatibility
      // Gemini rejects messages with metadata from other providers (e.g., thought_signature)
      const isGeminiModel = args.modelId.includes("gemini");
      const cleanedHistory = nonEmptyHistory.map((msg: any) => {
        if (isGeminiModel && msg.providerMetadata) {
          // Remove providerMetadata for Gemini models to avoid cross-model conflicts
          const { providerMetadata: _removed, ...rest } = msg;
          return rest;
        }
        return msg;
      });

      const allMessages = [...systemPrompts, ...cleanedHistory];

      // 8. Build reasoning options (unified for all providers)
      const reasoningResult =
        args.thinkingEffort && modelConfig?.reasoning
          ? buildReasoningOptions(modelConfig, args.thinkingEffort)
          : null;

      // 9. Get model
      const model = getModel(args.modelId);

      // 10. Apply middleware (e.g., DeepSeek tag extraction)
      const finalModel = reasoningResult?.applyMiddleware
        ? reasoningResult.applyMiddleware(model)
        : model;

      // 11. Build streamText options
      // biome-ignore lint/suspicious/noExplicitAny: Complex streamText options with dynamic properties
      const options: any = {
        model: finalModel,
        messages: allMessages,
        stopWhen: hasFunctionCalling ? stepCountIs(5) : undefined, // Multi-step tool calling
        providerOptions: getGatewayOptions(args.modelId, args.userId, ["chat"]),
      };

      // Fetch conversation to check for project-specific tools
      const conversation = await ctx.runQuery(
        internal.conversations.getInternal,
        {
          id: args.conversationId,
        },
      );

      // Only add tools for capable models
      // Note: Gemini Flash Lite has tool schema compatibility issues with Vercel AI SDK 4.0.34+
      // See: https://github.com/vercel/ai/issues - optional arrays/enums in tool schemas cause 400 errors
      const isGeminiFlashLite = args.modelId === "google:gemini-2.0-flash-lite";
      const shouldEnableTools = hasFunctionCalling && !isGeminiFlashLite;

      // Incognito mode settings
      const isIncognito = conversation?.isIncognito ?? false;
      const incognitoSettings = conversation?.incognitoSettings;
      const enableReadTools =
        !isIncognito || incognitoSettings?.enableReadTools !== false;

      if (shouldEnableTools) {
        // Capability tools: ALWAYS available (stateless, no persistent writes)
        const calculatorTool = createCalculatorTool();
        const dateTimeTool = createDateTimeTool();
        const webSearchTool = createWebSearchTool(ctx);
        const urlReaderTool = createUrlReaderTool(ctx);
        const fileDocumentTool = createFileDocumentTool(
          ctx,
          args.conversationId,
          messageAttachments,
        );
        const codeExecutionTool = createCodeExecutionTool(ctx);
        const weatherTool = createWeatherTool(ctx);

        // Start with capability tools
        // biome-ignore lint/suspicious/noExplicitAny: Tool types are complex
        const tools: Record<string, any> = {
          calculator: calculatorTool,
          datetime: dateTimeTool,
          webSearch: webSearchTool,
          urlReader: urlReaderTool,
          fileDocument: fileDocumentTool,
          codeExecution: codeExecutionTool,
          weather: weatherTool,
        };

        // Write tools: DISABLED for incognito (saveMemory, deleteMemory, manageTasks)
        if (!isIncognito) {
          const memorySaveTool = createMemorySaveTool(ctx, args.userId);
          const memoryDeleteTool = createMemoryDeleteTool(ctx, args.userId);
          const taskManagerTool = createTaskManagerTool(
            ctx,
            args.userId,
            conversation?.projectId,
          );
          tools.saveMemory = memorySaveTool;
          tools.deleteMemory = memoryDeleteTool;
          tools.manageTasks = taskManagerTool;
        }

        // Read tools: Configurable for incognito (search user data)
        if (enableReadTools) {
          const memorySearchTool = createMemorySearchTool(ctx, args.userId);
          const searchFilesTool = createSearchFilesTool(ctx, args.userId);
          const searchNotesTool = createSearchNotesTool(ctx, args.userId);
          const searchTasksTool = createSearchTasksTool(ctx, args.userId);
          const queryHistoryTool = createQueryHistoryTool(
            ctx,
            args.userId,
            args.conversationId,
          );
          const searchAllTool = createSearchAllTool(
            ctx,
            args.userId,
            args.conversationId,
          );
          tools.searchMemories = memorySearchTool;
          tools.searchFiles = searchFilesTool;
          tools.searchNotes = searchNotesTool;
          tools.searchTasks = searchTasksTool;
          tools.queryHistory = queryHistoryTool;
          tools.searchAll = searchAllTool;
        }

        options.tools = tools;

        // biome-ignore lint/suspicious/noExplicitAny: Complex AI SDK step types
        options.onStepFinish = async (step: any) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            const _completedCalls = step.toolCalls.map((tc: any) => ({
              id: tc.toolCallId,
              name: tc.toolName,
              arguments: JSON.stringify(tc.input || tc.args),
              result: JSON.stringify(
                step.toolResults?.find(
                  (tr: any) => tr.toolCallId === tc.toolCallId,
                )?.result,
              ),
              timestamp: Date.now(),
            }));

            // Phase 2 will add immediate persistence here
          }
        };
      }

      // 13. Apply provider options (merge with gateway options)
      if (reasoningResult?.providerOptions) {
        options.providerOptions = {
          ...options.providerOptions,
          ...reasoningResult.providerOptions,
        };
      }

      // 14. Apply headers (e.g., Anthropic beta)
      if (reasoningResult?.headers) {
        options.headers = reasoningResult.headers;
      }

      // 14. Detect if model supports reasoning (config or native capability)
      const hasReasoningCapability =
        !!modelConfig?.reasoning ||
        modelConfig?.capabilities?.includes("thinking");

      // Mark thinking phase started when user wants reasoning AND model supports it
      // Works for both configurable models (reasoningResult) and native reasoning models
      const shouldShowThinking =
        args.thinkingEffort &&
        args.thinkingEffort !== "none" &&
        hasReasoningCapability;
      if (shouldShowThinking) {
        await ctx.runMutation(internal.messages.markThinkingStarted, {
          messageId: args.assistantMessageId,
        });
      }

      // 6. Accumulate chunks, throttle DB updates
      let accumulated = "";
      let reasoningBuffer = "";
      // biome-ignore lint/suspicious/noExplicitAny: Complex tool call result types
      const toolCallsBuffer = new Map<string, any>();

      // Stream from LLM
      const result = streamText(options);
      let lastUpdate = Date.now();
      let lastReasoningUpdate = Date.now();
      const UPDATE_INTERVAL = 200; // ms

      for await (const chunk of result.fullStream) {
        const now = Date.now();

        // Handle tool invocations for loading state
        if (chunk.type === "tool-call") {
          toolCallsBuffer.set(chunk.toolCallId, {
            id: chunk.toolCallId,
            name: chunk.toolName,
            arguments: JSON.stringify(chunk.input),
            timestamp: Date.now(),
            textPosition: accumulated.length, // Track where in text this tool was called
          });

          // Phase 1: Write to new toolCalls table (dual-write)
          (await (ctx.runMutation as any)(internal.messages.upsertToolCall, {
            messageId: args.assistantMessageId,
            conversationId: args.conversationId,
            userId: args.userId,
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.input, // Native JSON (not stringified)
            isPartial: true,
            timestamp: Date.now(),
            textPosition: accumulated.length,
          })) as Promise<void>;
        }

        // Handle tool results (streaming results to frontend)
        if (chunk.type === "tool-result") {
          const existing = toolCallsBuffer.get(chunk.toolCallId);
          if (existing) {
            const resultValue = (chunk as any).result ?? (chunk as any).output;
            toolCallsBuffer.set(chunk.toolCallId, {
              ...existing,
              result: JSON.stringify(resultValue),
            });

            // Phase 1: Update with result (dual-write)
            (await (ctx.runMutation as any)(internal.messages.upsertToolCall, {
              messageId: args.assistantMessageId,
              conversationId: args.conversationId,
              userId: args.userId,
              toolCallId: chunk.toolCallId,
              toolName: existing.name,
              args: JSON.parse(existing.arguments),
              result: resultValue, // Native JSON
              isPartial: true,
              timestamp: existing.timestamp,
              textPosition: existing.textPosition,
            })) as Promise<void>;
          }
        }

        // Handle reasoning chunks (only when user wants reasoning displayed)
        // Skip when thinkingEffort is "none" - works for both configurable and native reasoning models
        const wantsReasoningStreamed =
          args.thinkingEffort && args.thinkingEffort !== "none";
        if (chunk.type === "reasoning-delta" && wantsReasoningStreamed) {
          reasoningBuffer += chunk.text;

          if (now - lastReasoningUpdate >= UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updatePartialReasoning, {
              messageId: args.assistantMessageId,
              partialReasoning: reasoningBuffer,
            });
            lastReasoningUpdate = now;
          }
        }

        // Handle text chunks
        if (chunk.type === "text-delta") {
          // Capture first token timestamp
          if (!firstTokenTime && chunk.text.length > 0) {
            firstTokenTime = now;

            // Immediately update message with firstTokenAt
            await ctx.runMutation(internal.messages.updateMetrics, {
              messageId: args.assistantMessageId,
              firstTokenAt: firstTokenTime,
            });
          }

          accumulated += chunk.text;

          if (now - lastUpdate >= UPDATE_INTERVAL) {
            // Check if message was stopped by user
            const currentMsg = (await (ctx.runQuery as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.messages.get,
              { messageId: args.assistantMessageId },
            )) as { status?: string } | null;
            if (currentMsg?.status === "stopped") {
              break; // Exit streaming loop - user cancelled
            }

            await ctx.runMutation(internal.messages.updatePartialContent, {
              messageId: args.assistantMessageId,
              partialContent: accumulated,
            });
            lastUpdate = now;
          }
        }
      }

      // Get final usage info
      const usage = await result.usage;

      // Complete thinking if user requested reasoning (thinkingEffort not "none")
      // This handles both configurable models (via reasoningResult) and native reasoning models
      const wantsReasoning =
        args.thinkingEffort && args.thinkingEffort !== "none";
      const reasoningOutputs = await result.reasoning;
      const finalReasoning =
        wantsReasoning && reasoningOutputs && reasoningOutputs.length > 0
          ? reasoningOutputs.map((r) => r.text).join("\n")
          : undefined;

      if (
        reasoningResult &&
        finalReasoning &&
        finalReasoning.trim().length > 0
      ) {
        await ctx.runMutation(internal.messages.completeThinking, {
          messageId: args.assistantMessageId,
          reasoning: finalReasoning,
          reasoningTokens: usage.reasoningTokens,
        });
      }

      // 8. Calculate cost
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const reasoningTokens = usage.reasoningTokens;

      const cost = calculateCost(args.modelId, {
        inputTokens,
        outputTokens,
        cachedTokens: undefined,
        reasoningTokens,
      });

      // Calculate TPS (tokens per second)
      const endTime = Date.now();
      const durationSeconds = (endTime - generationStartTime) / 1000;
      const tokensPerSecond =
        outputTokens && durationSeconds > 0
          ? outputTokens / durationSeconds
          : undefined;

      // Extract all tool calls from result.steps
      const steps = (await result.steps) || [];
      // biome-ignore lint/suspicious/noExplicitAny: Complex AI SDK step types
      const allToolCalls = steps
        .flatMap((step: any) => step.toolCalls || [])
        .map((tc: any) => {
          const stepResult = steps
            .flatMap((s: any) => s.toolResults || [])
            .find((tr: any) => tr.toolCallId === tc.toolCallId);

          return {
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: JSON.stringify(tc.input || tc.args),
            result: stepResult
              ? JSON.stringify(stepResult.result ?? stepResult.output)
              : undefined,
            timestamp: Date.now(),
          };
        });

      // Extract provider metadata (e.g. Gemini thought signatures)
      const providerMetadata = await result.providerMetadata;

      // Extract sources from response (Perplexity, web search models)
      // Vercel AI SDK v5+ automatically parses Perplexity sources into result.sources
      let sources:
        | Array<{
            position: number;
            title: string;
            url: string;
            snippet?: string;
            publishedDate?: string;
          }>
        | undefined;

      // Priority 1: Check if SDK already parsed sources (Perplexity via Gateway)
      // For streamText, sources is a promise that needs to be awaited
      try {
        const sdkSources = await (result as any).sources;

        if (sdkSources && Array.isArray(sdkSources) && sdkSources.length > 0) {
          sources = sdkSources.map((s: any, idx: number) => ({
            position: idx + 1, // Sequential positions for [1], [2], [3] citation markers
            title: s.url, // No title provided by Perplexity API, use URL as fallback
            url: s.url,
            snippet: undefined,
            publishedDate: undefined,
          }));

          console.log(
            `[Sources] Extracted ${sources.length} sources from result.sources (Perplexity)`,
          );
        } else {
          console.log(
            "[Sources] result.sources was empty or undefined, trying providerMetadata",
          );
        }
      } catch (_error) {
        console.log(
          "[Sources] result.sources not available, trying providerMetadata",
        );
      }

      // Priority 2: Fall back to extracting from providerMetadata (OpenRouter, etc.)
      if (!sources) {
        sources = extractSources(providerMetadata);
        if (sources) {
          console.log(
            `[Sources] Extracted ${sources.length} sources from providerMetadata`,
          );
        } else {
          console.log("[Sources] No sources found in providerMetadata either");
        }
      }

      // Extract webSearch tool sources and merge with Perplexity/provider sources
      const perplexitySourceCount = sources?.length || 0;
      const webSearchSources = extractWebSearchSources(
        allToolCalls,
        perplexitySourceCount,
      );

      // Merge sources with unified numbering
      const allSources = [
        ...(sources || []), // Perplexity [1], [2], [3]
        ...webSearchSources, // webSearch [4], [5], [6]...
      ];

      if (allSources.length > 0) {
        console.log(
          `[Sources] Total: ${allSources.length} (Perplexity: ${perplexitySourceCount}, WebSearch: ${webSearchSources.length})`,
        );
      }

      // Handle image generation (files in result)
      // This supports Gemini image models called via standard chat
      try {
        const files = await result.files;
        if (files && files.length > 0) {
          console.log("[Generation] Processing generated files:", files.length);

          for (const file of files) {
            let imageBytes: Uint8Array;

            // Handle Uint8Array format
            if ((file as any).uint8Array) {
              imageBytes = (file as any).uint8Array;
            }
            // Handle base64Data format
            else if ((file as any).base64Data) {
              const binaryString = atob((file as any).base64Data);
              const len = binaryString.length;
              imageBytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                imageBytes[i] = binaryString.charCodeAt(i);
              }
            } else {
              console.warn("[Generation] Unknown file format:", file);
              continue;
            }

            // Store in Convex file storage
            const storageId = await ctx.storage.store(
              new Blob([imageBytes as any], { type: "image/png" }),
            );

            // Add attachment to message
            await ctx.runMutation(internal.messages.addAttachment, {
              messageId: args.assistantMessageId,
              attachment: {
                type: "image",
                storageId,
                name: "generated-image.png",
                size: imageBytes.byteLength,
                mimeType: "image/png",
                metadata: {
                  prompt: lastUserMsg?.content || "",
                  model: args.modelId,
                  generationTime: Date.now() - generationStartTime,
                },
              },
            });
          }
        }
      } catch (error) {
        console.error("[Generation] Error processing generated files:", error);
      }

      // 9. Finalize tool calls (Phase 1: mark partials as complete)
      if (allToolCalls.length > 0) {
        (await (ctx.runMutation as any)(internal.messages.finalizeToolCalls, {
          messageId: args.assistantMessageId,
        })) as Promise<void>;
      }

      // 9.5. Add sources to normalized tables (Phase 2)
      if (allSources.length > 0) {
        // Determine provider based on source composition
        const provider =
          modelConfig.provider === "perplexity"
            ? "perplexity"
            : webSearchSources.length > 0
              ? "tool"
              : "generic";

        await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.sources.operations_actions.addSources,
          {
            messageId: args.assistantMessageId,
            conversationId: args.conversationId,
            userId: args.userId,
            provider,
            sources: allSources.map((s) => ({
              position: s.position, // Use pre-computed positions for unified numbering
              title: s.title,
              url: s.url,
              snippet: s.snippet,
            })),
          },
        );
      }

      // 10. Final completion - skip if user already stopped
      const finalCheck = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.messages.get,
        { messageId: args.assistantMessageId },
      )) as { status?: string } | null;

      if (finalCheck?.status !== "stopped") {
        // Store reasoning if present - models may return it natively even without config
        await ctx.runMutation(internal.messages.completeMessage, {
          messageId: args.assistantMessageId,
          content: accumulated,
          reasoning: finalReasoning,
          inputTokens,
          outputTokens,
          reasoningTokens,
          cost,
          tokensPerSecond,
          // sources: removed - now using normalized tables only (Phase 2 complete)
          providerMetadata,
        });
      }

      // Track streaming completed with performance metrics
      const generationTimeMs = Date.now() - generationStartTime;
      const firstTokenLatencyMs = firstTokenTime
        ? firstTokenTime - generationStartTime
        : undefined;

      await trackServerEvent(
        "message_streaming_completed",
        {
          model: args.modelId,
          messageId: args.assistantMessageId,
          tokensPerSecond,
          generationTimeMs,
          firstTokenLatencyMs,
        },
        args.userId,
      );

      // 10. Update conversation timestamp
      await ctx.runMutation(internal.conversations.updateLastMessageAt, {
        conversationId: args.conversationId,
      });

      // 11. Calculate and update token usage
      const allMessagesForCounting = await ctx.runQuery(
        internal.messages.listInternal,
        { conversationId: args.conversationId },
      );

      // System prompts (tool-based memory retrieval tokens counted separately by AI SDK)
      const systemPromptStrings: string[] = systemPrompts.map((msg) =>
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      );

      const tokenUsage = await calculateConversationTokensAsync(
        systemPromptStrings,
        memoryContentForTracking ? [memoryContentForTracking] : [],
        allMessagesForCounting,
        modelConfig.contextWindow,
        args.modelId,
      );

      // Legacy conversation-level token usage (Phase 6: keep for backward compat)
      await ctx.runMutation(internal.conversations.updateTokenUsage, {
        conversationId: args.conversationId,
        tokenUsage,
      });

      // Phase 6: Per-model token tracking (new normalized table)
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.conversations.updateConversationTokenUsage,
        {
          conversationId: args.conversationId,
          model: args.modelId,
          inputTokens,
          outputTokens,
          reasoningTokens: reasoningTokens || 0,
        },
      )) as Promise<void>;

      // 12. Auto-name if conversation still has default title
      const conversationForTitle = await ctx.runQuery(
        internal.conversations.getInternal,
        {
          id: args.conversationId,
        },
      );

      if (conversationForTitle && conversationForTitle.title === "New Chat") {
        // Still has default title, schedule title generation
        await ctx.scheduler.runAfter(
          0,
          internal.ai.generateTitle.generateTitle,
          {
            conversationId: args.conversationId,
          },
        );
      }

      // 13. Trigger model triage analysis for cost optimization
      // Runs async in background, analyzes if cheaper model would work
      const lastUserMsgForTriage = messages
        .filter((m: Doc<"messages">) => m.role === "user")
        .sort(
          (a: Doc<"messages">, b: Doc<"messages">) => b.createdAt - a.createdAt,
        )[0];

      if (lastUserMsgForTriage) {
        await ctx.scheduler.runAfter(
          0,
          internal.ai.modelTriage.analyzeModelFit,
          {
            conversationId: args.conversationId,
            userMessage: lastUserMsgForTriage.content,
            currentModelId: args.modelId,
          },
        );
      }
    } catch (error) {
      // Enhanced error logging to capture full gateway error details
      console.error("[Generation] Error:", error);

      // Extract and log full responseBody from gateway errors for debugging
      const causeObj = (error as any)?.cause || {};
      if (causeObj.responseBody) {
        try {
          const parsedBody = JSON.parse(causeObj.responseBody);
          console.error("[Generation] Full gateway error:", {
            statusCode: causeObj.statusCode || (error as any).statusCode,
            model: args.modelId,
            errorMessage: parsedBody?.error?.message,
            fullResponse: parsedBody,
          });
        } catch {
          console.error(
            "[Generation] Raw gateway responseBody:",
            causeObj.responseBody,
          );
        }
      }

      // Classify error type for AI-specific tracking
      const errorType =
        error instanceof Error ? classifyStreamingError(error) : "unknown";
      const isCreditsError = detectCreditsError(error);

      // Calculate wasted cost if streaming failed mid-generation
      const modelConfig = getModelConfig(args.modelId);
      const wastedCost =
        firstTokenTime && modelConfig?.pricing
          ? estimateWastedCost(0, {
              input: modelConfig.pricing.input,
              output: modelConfig.pricing.output,
            })
          : 0;

      // Comprehensive error tracking with AI-specific context
      await captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: args.userId,
          conversationId: args.conversationId,
          messageId: args.assistantMessageId,
          model: args.modelId,
          errorType,
          context: "ai_generation",
          severity: isCreditsError ? "error" : "warning",
          wastedCost,
          generationStartTime,
          firstTokenTime,
        },
      );

      if (isCreditsError) {
        // Send immediate email alert (non-blocking)
        await ctx.scheduler.runAfter(
          0,
          internal.emails.utils.send.sendApiCreditsAlert,
          {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            modelId: args.modelId,
          },
        );
      }

      // Detect specific error types for user-friendly messages
      let userMessage = "An unexpected error occurred. Please try again.";

      if (error instanceof Error) {
        const errorStr = error.message || "";
        const errorName = error.name || "";
        const causeStr = JSON.stringify((error as any).cause || {});

        // Model switch not allowed (Gemini thought signature requirement)
        if (errorStr.includes("MODEL_SWITCH_NOT_ALLOWED")) {
          userMessage =
            "Gemini 3 Pro Image cannot be used mid-conversation because it requires special message formatting from the start. Please start a new chat to use this model.";
        }
        // Model not found error
        else if (
          errorStr.includes("not found") ||
          errorName.includes("ModelNotFound") ||
          causeStr.includes("model_not_found")
        ) {
          const modelMatch = errorStr.match(/Model '([^']+)'/);
          const modelId = modelMatch ? modelMatch[1] : args.modelId;
          userMessage = `The model "${modelId}" is not available. This may be a temporary issue or the model ID may have changed. Please try a different model or contact support.`;
        }
        // Rate limit error
        else if (
          errorStr.includes("rate limit") ||
          errorStr.includes("too many requests") ||
          errorStr.includes("429")
        ) {
          userMessage =
            "Rate limit exceeded. Please wait a moment and try again.";
        }
        // API key/auth error
        else if (
          errorStr.includes("unauthorized") ||
          errorStr.includes("401") ||
          errorStr.includes("API key")
        ) {
          userMessage =
            "Authentication error. Please check your API configuration or contact support.";
        }
        // Gemini thought_signature / content format error
        else if (
          errorStr.includes("thought_signature") ||
          causeStr.includes("thought_signature") ||
          errorStr.includes("content position")
        ) {
          userMessage =
            "This conversation has history from a different model that isn't compatible. Please start a new chat or try a different model.";
        }
        // Gemini 400 error - content rejection or context issues
        else if (
          (causeObj.statusCode === 400 || (error as any).statusCode === 400) &&
          args.modelId.includes("gemini")
        ) {
          // Try to get specific error from responseBody
          let specificMessage: string | null = null;
          if (causeObj.responseBody) {
            try {
              const parsed = JSON.parse(causeObj.responseBody);
              specificMessage = parsed?.error?.message;
            } catch {
              /* ignore */
            }
          }

          if (
            specificMessage?.includes("Unable to submit") ||
            specificMessage?.includes("content")
          ) {
            userMessage =
              "This model couldn't process the content. Try a different model like GPT-OSS-20B or Claude, or start a new conversation.";
          } else if (
            specificMessage?.includes("context") ||
            specificMessage?.includes("too long")
          ) {
            userMessage =
              "The conversation is too long for this model. Try a model with larger context like Gemini 2.5 Pro.";
          } else {
            userMessage = specificMessage
              ? `Gemini error: ${specificMessage.slice(0, 150)}`
              : "Gemini couldn't process this request. Try a different model or start a new chat.";
          }
        }
        // Gateway/network error
        else if (
          errorStr.includes("network") ||
          errorStr.includes("ECONNREFUSED")
        ) {
          userMessage =
            "Connection error. Please check your network and try again.";
        }
        // Other gateway errors with specific messages
        else if (
          errorName.includes("Gateway") ||
          causeStr.includes("Gateway")
        ) {
          // Try to extract a readable message from the gateway error
          const causeObj = (error as any).cause || {};
          const innerMessage = causeObj.responseBody
            ? JSON.parse(causeObj.responseBody)?.error?.message
            : null;
          if (innerMessage && innerMessage.length < 200) {
            userMessage = innerMessage;
          } else {
            userMessage =
              "A gateway error occurred. Please try again or use a different model.";
          }
        }
        // Fallback to original message if informative
        else if (errorStr.length > 0 && errorStr.length < 200) {
          userMessage = errorStr;
        }
      }

      console.error("[Generation] Error:", error);

      await ctx.runMutation(internal.messages.markError, {
        messageId: args.assistantMessageId,
        error: userMessage,
      });
      throw error;
    }
  },
});

/**
 * Summarize selected text using AI
 */
export const summarizeSelection = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args) => {
    // Create abort controller with 30s timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      // Generate summary using GPT-OSS 120B via gateway
      const summarizationModel = MODEL_CONFIG["openai:gpt-oss-120b"];
      const result = await generateText({
        model: getModel(summarizationModel.id),
        messages: [
          {
            role: "system",
            content: SUMMARIZATION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildSummarizationPrompt(args.text),
          },
        ],
        abortSignal: abortController.signal,
        providerOptions: getGatewayOptions(summarizationModel.id, undefined, [
          "summary",
        ]),
      });

      clearTimeout(timeoutId);
      return { summary: result.text };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          "Summary generation timed out. Please try again with a shorter selection.",
        );
      }

      // Re-throw other errors
      throw error;
    }
  },
});
