"use node";

import { generateText, stepCountIs, streamText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { getModel } from "@/lib/ai/registry";
import { calculateCost, getModelConfig } from "@/lib/ai/utils";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { downloadAttachment } from "./generation/attachments";
import { extractSources, extractWebSearchSources } from "./generation/sources";
import { buildTools, createOnStepFinish } from "./generation/tools";
import { trackServerEvent } from "./lib/analytics";
import {
  type BudgetState,
  createBudgetState,
  estimateToolCost,
  isContextGettingFull,
  MIN_TOOL_CALLS_FOR_TRUNCATION,
  recordUsage,
  truncateToolResult,
} from "./lib/budgetTracker";
import {
  captureException,
  classifyStreamingError,
  detectCreditsError,
  estimateWastedCost,
} from "./lib/errorTracking";
import { logger } from "./lib/logger";
import type { MemoryExtractionLevel } from "./lib/prompts/operational/memoryExtraction";
import {
  buildSummarizationPrompt,
  SUMMARIZATION_SYSTEM_PROMPT,
} from "./lib/prompts/operational/summarization";
import { buildSystemPrompts } from "./lib/prompts/systemBuilder";
import { StreamingTextBuffer } from "./lib/utils/utf8Safe";
import {
  calculateConversationTokensAsync,
  estimateTokens,
} from "./tokens/counting";

// Re-export generation submodules
export * as image from "./generation/image";

/** Maximum tool execution steps before stopping (prevents runaway loops) */
const MAX_TOOL_STEPS = 15;

// Minimal message shape for fast inference (client sends, server skips DB fetch)
const passedMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  model: v.optional(v.string()),
});

export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
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
    comparisonGroupId: v.optional(v.string()), // For comparison mode
    existingMessageId: v.optional(v.id("messages")), // For regeneration (reuse existing message)
    systemPromptOverride: v.optional(v.string()), // For consolidation
    /** Messages from client for fast inference (skip DB fetch) */
    passedMessages: v.optional(v.array(passedMessageValidator)),
  },
  handler: async (ctx, args) => {
    // Timing variables for performance metrics
    const generationStartTime = Date.now();
    let firstTokenTime: number | undefined;

    // AUTO ROUTER: If model is "auto", route to optimal model
    let modelId = args.modelId;
    const _wasAutoSelected = modelId === "auto";
    let routingDecision:
      | {
          selectedModelId: string;
          classification: {
            primaryCategory: string;
            secondaryCategory?: string;
            complexity: string;
            requiresVision: boolean;
            requiresLongContext: boolean;
            requiresReasoning: boolean;
            confidence: number;
          };
          reasoning: string;
        }
      | undefined;

    if (modelId === "auto") {
      // Get user's router preferences
      const [costBias, speedBias] = await Promise.all([
        (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          api.users.getUserPreferenceByUserId,
          { userId: args.userId, key: "autoRouterCostBias" },
        ) as Promise<number | null>,
        (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          api.users.getUserPreferenceByUserId,
          { userId: args.userId, key: "autoRouterSpeedBias" },
        ) as Promise<number | null>,
      ]);

      // Get the last user message for classification
      const lastUserMessage = args.passedMessages
        ?.filter((m) => m.role === "user")
        .pop();
      const userMessageContent = lastUserMessage?.content ?? "";

      // Check if conversation has any attachments (for routing decision)
      const recentMessages = await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 84+ Convex modules
        internal.messages.listInternal,
        { conversationId: args.conversationId, limit: 10 },
      );
      const recentMessageIds = recentMessages.map(
        (m: { _id: Id<"messages"> }) => m._id,
      );
      const attachments =
        recentMessageIds.length > 0
          ? await ctx.runQuery(
              internal.lib.helpers.getAttachmentsByMessageIds,
              {
                messageIds: recentMessageIds,
              },
            )
          : [];
      const hasAttachments = attachments.length > 0;

      // Get previous routing decision for stickiness bias
      const previousSelectedModel = (
        recentMessages as Array<{
          role: string;
          routingDecision?: { selectedModelId: string };
        }>
      )
        .filter(
          (m) => m.role === "assistant" && m.routingDecision?.selectedModelId,
        )
        .pop()?.routingDecision?.selectedModelId;

      // Route the message
      const routerResult = (await ctx.runAction(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.ai.autoRouter.routeMessage,
        {
          userMessage: userMessageContent,
          conversationId: args.conversationId,
          userId: args.userId,
          hasAttachments,
          currentContextTokens: 0, // Will be calculated from messages
          preferences: {
            costBias: costBias ?? 50,
            speedBias: speedBias ?? 50,
          },
          previousSelectedModel,
        },
      )) as {
        selectedModelId: string;
        classification: {
          primaryCategory: string;
          secondaryCategory?: string;
          complexity: string;
          requiresVision: boolean;
          requiresLongContext: boolean;
          requiresReasoning: boolean;
          confidence: number;
        };
        reasoning: string;
        candidatesConsidered: number;
      };

      // Use the selected model
      modelId = routerResult.selectedModelId;
      routingDecision = {
        selectedModelId: routerResult.selectedModelId,
        classification: routerResult.classification,
        reasoning: routerResult.reasoning,
      };

      logger.info("Auto router selected model", {
        conversationId: args.conversationId,
        selectedModel: modelId,
        classification: routerResult.classification.primaryCategory,
      });

      // Update existing message with routing decision if it was pre-created
      if (args.existingMessageId) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.messages.updateRoutingDecision,
          {
            messageId: args.existingMessageId,
            model: modelId,
            routingDecision,
          },
        );
      }
    }

    // 1. Create or reuse assistant message
    const assistantMessageId = args.existingMessageId
      ? args.existingMessageId
      : ((await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.messages.create,
          {
            conversationId: args.conversationId,
            userId: args.userId,
            role: "assistant",
            status: "generating",
            model: modelId,
            comparisonGroupId: args.comparisonGroupId,
            routingDecision,
          },
        )) as string as typeof args.conversationId extends string
          ? never
          : any);

    // Declared outside try so they're accessible in catch for wasted cost calculation
    let accumulated = "";
    let inputTokenEstimate = 0;

    try {
      // PARALLEL QUERIES: Batch all initial queries for faster TTFT
      const [messages, conversation, memoryExtractionLevelRaw] =
        await Promise.all([
          // Get conversation history - limit to recent 30 messages for faster TTFT
          // (300ms → 50ms improvement for long conversations)
          ctx.runQuery(internal.messages.listInternal, {
            conversationId: args.conversationId,
            limit: 30,
          }),
          // Get conversation for tool filtering
          ctx.runQuery(internal.conversations.getInternal, {
            id: args.conversationId,
          }),
          // Get user memory preference
          (ctx.runQuery as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            api.users.getUserPreferenceByUserId,
            { userId: args.userId, key: "memoryExtractionLevel" },
          ) as Promise<string | null>,
        ]);

      // Estimate input tokens for wasted cost tracking (accessible in catch block)
      inputTokenEstimate = messages.reduce(
        (sum: number, m: Doc<"messages">) =>
          sum + estimateTokens(m.content || ""),
        0,
      );

      const memoryExtractionLevel = (memoryExtractionLevelRaw ??
        "moderate") as MemoryExtractionLevel;

      // 2. Set generation started timestamp
      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: assistantMessageId,
        status: "generating",
        generationStartedAt: generationStartTime,
      });

      // 2.5 Check if trying to switch to a Gemini thought-signature model mid-conversation
      const requiresThoughtSignature = modelId.includes("gemini-3-pro-image");
      const hasExistingAssistantMessages =
        messages.filter((m: Doc<"messages">) => m.role === "assistant").length >
        0;
      if (requiresThoughtSignature && hasExistingAssistantMessages) {
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

      // 3. Get model config first (sync operation, needed to skip unnecessary fetches)
      const modelConfig = getModelConfig(modelId);
      if (!modelConfig) {
        throw new Error(`Model ${modelId} not found in configuration`);
      }

      const hasVision = modelConfig.capabilities?.includes("vision") ?? false;
      const hasFunctionCalling =
        modelConfig.capabilities?.includes("function-calling") ?? false;

      // 3b. Initialize budget tracking (Phase 1 infrastructure, used in Phase 3)
      let budgetState: BudgetState = createBudgetState(
        modelConfig.contextWindow,
      );

      // 4. Get last user message for memory retrieval
      const lastUserMsg = messages
        .filter((m: Doc<"messages">) => m.role === "user")
        .sort(
          (a: Doc<"messages">, b: Doc<"messages">) => b.createdAt - a.createdAt,
        )[0];

      // 5. Skip attachment fetch if model doesn't have function-calling
      // (fileDocument tool won't be available anyway - saves ~20-50ms)
      const messageAttachments =
        hasFunctionCalling && lastUserMsg
          ? await ctx.runQuery(internal.lib.helpers.getMessageAttachments, {
              messageId: lastUserMsg._id,
            })
          : undefined;

      // 6. Build system prompts (or use override for consolidation)
      // OPTIMIZATION: Use cached prompt if available (built in background on conversation creation)
      let systemPromptsResult: {
        messages: any[];
        memoryContent: string | null;
      };

      if (args.systemPromptOverride) {
        // Consolidation mode: use override directly
        systemPromptsResult = {
          messages: [
            { role: "system" as const, content: args.systemPromptOverride },
          ],
          memoryContent: null,
        };
      } else if (conversation?.cachedSystemPrompt) {
        // Use cached prompt (fast path - no queries needed)
        try {
          const cachedMessages = JSON.parse(conversation.cachedSystemPrompt);
          systemPromptsResult = {
            messages: cachedMessages,
            memoryContent: null, // Not tracked for cached prompts
          };
          logger.info("Using cached system prompt", {
            tag: "Generation",
            messageCount: cachedMessages.length,
          });
        } catch (_e) {
          logger.error("Failed to parse cached prompt, falling back", {
            tag: "Generation",
          });
          // Fall through to buildSystemPrompts
          systemPromptsResult = await buildSystemPrompts(ctx, {
            userId: args.userId,
            conversationId: args.conversationId,
            userMessage: lastUserMsg?.content || "",
            modelConfig,
            hasFunctionCalling,
            prefetchedMemories: null,
            memoryExtractionLevel,
            budgetState,
          });
        }
      } else {
        // Cold start fallback: build synchronously (first message or cache miss)
        logger.info("No cached prompt, building synchronously", {
          tag: "Generation",
        });
        systemPromptsResult = await buildSystemPrompts(ctx, {
          userId: args.userId,
          conversationId: args.conversationId,
          userMessage: lastUserMsg?.content || "",
          modelConfig,
          hasFunctionCalling,
          prefetchedMemories: null,
          memoryExtractionLevel,
          budgetState,
        });
      }

      const systemPrompts = systemPromptsResult.messages;
      const memoryContentForTracking = systemPromptsResult.memoryContent;

      // 7. Filter and transform conversation history (with attachments if vision model)
      // Filter messages first
      const filteredMessages = messages.filter(
        (m: Doc<"messages">) =>
          m._id !== assistantMessageId && m.status === "complete",
      );

      // OPTIMIZATION: Batch fetch all attachments in single query (O(1) instead of O(n))
      const allAttachments = await ctx.runQuery(
        internal.lib.helpers.getAttachmentsByMessageIds,
        { messageIds: filteredMessages.map((m: Doc<"messages">) => m._id) },
      );

      // Group attachments by messageId for O(1) lookup
      const attachmentsByMessage = new Map<string, Doc<"attachments">[]>();
      for (const attachment of allAttachments) {
        const msgId = attachment.messageId as string;
        if (!attachmentsByMessage.has(msgId)) {
          attachmentsByMessage.set(msgId, []);
        }
        attachmentsByMessage.get(msgId)!.push(attachment);
      }

      // Download cache for vision models (within this generation only)
      const downloadCache = new Map<string, string>();
      async function getCachedDownload(storageId: string): Promise<string> {
        const cached = downloadCache.get(storageId);
        if (cached) return cached;
        const base64 = await downloadAttachment(ctx, storageId);
        downloadCache.set(storageId, base64);
        return base64;
      }

      const history = await Promise.all(
        filteredMessages.map(async (m: Doc<"messages">) => {
          // Get attachments from pre-fetched map (O(1) lookup)
          const attachments = attachmentsByMessage.get(m._id as string) || [];

          // Text-only messages (no attachments)
          if (attachments.length === 0) {
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
          const contentParts: any[] = [
            { type: "text", text: `${m.content || ""}\n\n${attachmentInfo}` },
          ];

          // PARALLEL: Download all attachments concurrently (with caching)
          const downloadResults = await Promise.all(
            attachments.map(async (attachment: Doc<"attachments">) => ({
              attachment,
              base64: await getCachedDownload(attachment.storageId),
            })),
          );

          for (const { attachment, base64 } of downloadResults) {
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
      const isGeminiModel = modelId.includes("gemini");
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
      const model = getModel(modelId);

      // 10. Apply middleware (e.g., DeepSeek tag extraction)
      const finalModel = reasoningResult?.applyMiddleware
        ? reasoningResult.applyMiddleware(model)
        : model;

      // 11. Build streamText options
      const options: any = {
        model: finalModel,
        messages: allMessages,
        stopWhen: hasFunctionCalling ? stepCountIs(MAX_TOOL_STEPS) : undefined,
        providerOptions: getGatewayOptions(modelId, args.userId, ["chat"]),
      };

      // Only add tools for capable models
      // Note: Gemini Flash Lite has tool schema compatibility issues with Vercel AI SDK 4.0.34+
      // See: https://github.com/vercel/ai/issues - optional arrays/enums in tool schemas cause 400 errors
      const isGeminiFlashLite = modelId === "google:gemini-2.0-flash-lite";
      const shouldEnableTools = hasFunctionCalling && !isGeminiFlashLite;

      // Search cache: cleared after each generation (scoped to this action)
      const searchCache = new Map<string, unknown>();

      if (shouldEnableTools) {
        options.tools = buildTools({
          ctx,
          userId: args.userId,
          conversationId: args.conversationId,
          messageAttachments,
          memoryExtractionLevel,
          conversation,
          searchCache,
          budgetState: {
            get current() {
              return budgetState;
            },
            update: (newState: BudgetState) => {
              budgetState = newState;
            },
          },
        });
        options.onStepFinish = createOnStepFinish();
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
          messageId: assistantMessageId,
        });
      }

      // 6. Accumulate chunks, throttle DB updates
      accumulated = ""; // Reset at start of streaming (declared outside try for catch access)
      let reasoningBuffer = "";
      const toolCallsBuffer = new Map<string, any>();

      // UTF-8 safe streaming buffers to prevent surrogate pair splitting (emoji/CJK)
      const textBuffer = new StreamingTextBuffer();
      const reasoningTextBuffer = new StreamingTextBuffer();

      // AbortController for immediate stream termination on stop
      const abortController = new AbortController();
      let lastStopCheck = Date.now();
      const STOP_CHECK_INTERVAL = 10; // ms - decoupled from write throttle for faster stop response

      // Stream from LLM - capture exact API call time for true TTFT
      const apiCallStartedAt = Date.now();
      const result = streamText({
        ...options,
        abortSignal: abortController.signal,
      });
      let lastUpdate = Date.now();
      let lastReasoningUpdate = Date.now();
      const UPDATE_INTERVAL = 50; // ms - reduced from 200ms for smoother streaming at high TPS

      for await (const chunk of result.fullStream) {
        const now = Date.now();

        // Check stop every 10ms (decoupled from write throttle for faster response)
        if (now - lastStopCheck >= STOP_CHECK_INTERVAL) {
          const currentMsg = (await (ctx.runQuery as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.messages.get,
            { messageId: assistantMessageId },
          )) as { status?: string } | null;
          if (currentMsg?.status === "stopped") {
            abortController.abort();
            break;
          }
          lastStopCheck = now;
        }

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
            messageId: assistantMessageId,
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
            let resultValue = (chunk as any).result ?? (chunk as any).output;

            // Phase 3: Truncate tool results when context is getting full
            if (
              isContextGettingFull(budgetState) &&
              toolCallsBuffer.size > MIN_TOOL_CALLS_FOR_TRUNCATION
            ) {
              resultValue = truncateToolResult(resultValue, 500);
            }

            toolCallsBuffer.set(chunk.toolCallId, {
              ...existing,
              result: JSON.stringify(resultValue),
            });

            // Phase 1: Update with result (dual-write)
            (await (ctx.runMutation as any)(internal.messages.upsertToolCall, {
              messageId: assistantMessageId,
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

            // Track tool call for analytics
            trackServerEvent(
              "tool_call_executed",
              {
                tool: existing.name,
                messageId: assistantMessageId,
                conversationId: args.conversationId,
                success: !(resultValue as any)?.error,
              },
              args.userId,
            ).catch(() => {}); // Fire-and-forget

            // Track tool usage in budget (Phase 1 infrastructure, used in Phase 3)
            const resultStr = JSON.stringify(resultValue ?? "");
            const estimatedTokens = Math.max(
              estimateToolCost(existing.name),
              estimateTokens(resultStr),
            );
            budgetState = recordUsage(budgetState, estimatedTokens);
          }
        }

        // Handle reasoning chunks (only when user wants reasoning displayed)
        // Skip when thinkingEffort is "none" - works for both configurable and native reasoning models
        const wantsReasoningStreamed =
          args.thinkingEffort && args.thinkingEffort !== "none";
        if (chunk.type === "reasoning-delta" && wantsReasoningStreamed) {
          // UTF-8 safe: buffer incomplete surrogate pairs
          const safeReasoningChunk = reasoningTextBuffer.process(chunk.text);
          if (safeReasoningChunk) {
            reasoningBuffer += safeReasoningChunk;
          }

          if (now - lastReasoningUpdate >= UPDATE_INTERVAL) {
            const updateResult = await ctx.runMutation(
              internal.messages.updatePartialReasoning,
              {
                messageId: assistantMessageId,
                partialReasoning: reasoningBuffer,
              },
            );
            if (!updateResult.updated) {
              abortController.abort();
              break;
            }
            lastReasoningUpdate = now;
          }
        }

        // Handle text chunks
        if (chunk.type === "text-delta") {
          // Capture first token timestamp and track analytics (deferred from before streaming)
          if (!firstTokenTime && chunk.text.length > 0) {
            firstTokenTime = now;

            // Immediately update message with firstTokenAt and apiCallStartedAt for true TTFT
            await ctx.runMutation(internal.messages.updateMetrics, {
              messageId: assistantMessageId,
              apiCallStartedAt,
              firstTokenAt: firstTokenTime,
            });

            // DEFERRED ANALYTICS: Track streaming started after first token arrives
            // This moves ~15ms of analytics work out of the critical path to TTFT
            trackServerEvent(
              "message_streaming_started",
              {
                model: modelId,
                messageId: assistantMessageId,
                conversationId: args.conversationId,
                firstTokenLatencyMs: firstTokenTime - generationStartTime,
              },
              args.userId,
            ).catch(() => {}); // Fire-and-forget, don't block streaming
          }

          // UTF-8 safe: buffer incomplete surrogate pairs to prevent JSON.stringify crashes
          const safeChunk = textBuffer.process(chunk.text);
          if (safeChunk) {
            accumulated += safeChunk;
          }

          if (now - lastUpdate >= UPDATE_INTERVAL) {
            const updateResult = await ctx.runMutation(
              internal.messages.updatePartialContent,
              {
                messageId: assistantMessageId,
                partialContent: accumulated,
              },
            );
            if (!updateResult.updated) {
              abortController.abort();
              break;
            }
            lastUpdate = now;
          }
        }
      }

      // Flush any remaining buffered content
      const remainingText = textBuffer.flush();
      if (remainingText) {
        accumulated += remainingText;
      }
      const remainingReasoning = reasoningTextBuffer.flush();
      if (remainingReasoning) {
        reasoningBuffer += remainingReasoning;
      }

      // If we aborted (user stopped), exit early - no finalization needed
      // Message already marked as stopped, partial content preserved
      if (abortController.signal.aborted) {
        logger.info("Generation stopped by user (loop exit)", {
          tag: "Generation",
          messageId: assistantMessageId,
        });
        return;
      }

      // Check if we have tool calls but no text response - request continuation
      const hasToolCalls = toolCallsBuffer.size > 0;
      const hasNoText = accumulated.trim().length === 0;
      let continuationUsage: { inputTokens?: number; outputTokens?: number } =
        {};

      if (hasToolCalls && hasNoText) {
        logger.info(
          "Tool calls completed but no text, requesting continuation",
          {
            tag: "Generation",
          },
        );

        // Build tool call/result messages from buffer
        const completedToolCalls = Array.from(toolCallsBuffer.values()).filter(
          (tc) => tc.result,
        );

        if (completedToolCalls.length > 0) {
          try {
            const continuationResult = await generateText({
              model: getModel(modelId),
              messages: [
                ...allMessages,
                {
                  role: "assistant",
                  content: completedToolCalls.map((tc) => ({
                    type: "tool-call" as const,
                    toolCallId: tc.id,
                    toolName: tc.name,
                    args: JSON.parse(tc.arguments),
                  })),
                },
                {
                  role: "tool",
                  content: completedToolCalls.map((tc) => ({
                    type: "tool-result" as const,
                    toolCallId: tc.id,
                    result: JSON.parse(tc.result),
                  })),
                },
              ],
              providerOptions: getGatewayOptions(modelId, args.userId, [
                "chat-continuation",
              ]),
            });

            accumulated = continuationResult.text;
            continuationUsage = {
              inputTokens: continuationResult.usage?.inputTokens ?? 0,
              outputTokens: continuationResult.usage?.outputTokens ?? 0,
            };

            // Update UI with continuation result
            const updateResult = await ctx.runMutation(
              internal.messages.updatePartialContent,
              {
                messageId: assistantMessageId,
                partialContent: accumulated,
              },
            );
            if (!updateResult.updated) {
              // Message was stopped - still record continuation metrics
              const contCost = calculateCost(modelId, {
                inputTokens: continuationUsage.inputTokens ?? 0,
                outputTokens: continuationUsage.outputTokens ?? 0,
                cachedTokens: undefined,
                reasoningTokens: undefined,
              });
              await ctx.runMutation(internal.messages.completeMessage, {
                messageId: assistantMessageId,
                content: accumulated,
                inputTokens: continuationUsage.inputTokens ?? 0,
                outputTokens: continuationUsage.outputTokens ?? 0,
                cost: contCost,
              });
              return;
            }

            logger.info("Continuation successful", {
              tag: "Generation",
              charCount: accumulated.length,
            });
          } catch (continuationError) {
            logger.error("Continuation failed, using fallback", {
              tag: "Generation",
              error: String(continuationError),
            });
            // Fallback: generate summary from tool results
            const toolSummaries = completedToolCalls.map((tc) => {
              try {
                const result = JSON.parse(tc.result);
                if (result.success === false) {
                  return `• ${tc.name}: Failed - ${result.error || "Unknown error"}`;
                }
                return `• ${tc.name}: Completed successfully`;
              } catch {
                return `• ${tc.name}: Completed`;
              }
            });
            accumulated = `I executed the following tools:\n${toolSummaries.join("\n")}`;
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
          messageId: assistantMessageId,
          reasoning: finalReasoning,
          reasoningTokens: usage.reasoningTokens,
        });
      }

      // 8. Calculate cost (include continuation usage if any)
      const inputTokens =
        (usage.inputTokens ?? 0) + (continuationUsage.inputTokens ?? 0);
      const outputTokens =
        (usage.outputTokens ?? 0) + (continuationUsage.outputTokens ?? 0);
      const reasoningTokens = usage.reasoningTokens;

      const cost = calculateCost(modelId, {
        inputTokens,
        outputTokens,
        cachedTokens: undefined,
        reasoningTokens,
      });

      // Calculate TPS (tokens per second) - measure from first token, not action start
      // This excludes setup time (memory fetch, prompt building) for accurate speed display
      const endTime = Date.now();
      const generationDuration = firstTokenTime
        ? endTime - firstTokenTime
        : endTime - generationStartTime; // Fallback if no tokens generated
      const tokensPerSecond =
        outputTokens && generationDuration > 0
          ? outputTokens / (generationDuration / 1000)
          : undefined;

      // Extract all tool calls from result.steps
      const steps = (await result.steps) || [];
      const toolResultsMap = new Map<string, any>();
      for (const step of steps as any[]) {
        for (const tr of step.toolResults || []) {
          toolResultsMap.set(tr.toolCallId, tr);
        }
      }
      const allToolCalls = steps
        .flatMap((step: any) => step.toolCalls || [])
        .map((tc: any) => {
          const stepResult = toolResultsMap.get(tc.toolCallId);
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

          logger.info("Extracted sources from result.sources (Perplexity)", {
            tag: "Sources",
            count: sources.length,
          });
        } else {
          logger.info(
            "result.sources was empty or undefined, trying providerMetadata",
            {
              tag: "Sources",
            },
          );
        }
      } catch (_error) {
        logger.info("result.sources not available, trying providerMetadata", {
          tag: "Sources",
        });
      }

      // Priority 2: Fall back to extracting from providerMetadata (OpenRouter, etc.)
      if (!sources) {
        sources = extractSources(providerMetadata);
        if (sources) {
          logger.info("Extracted sources from providerMetadata", {
            tag: "Sources",
            count: sources.length,
          });
        } else {
          logger.info("No sources found in providerMetadata either", {
            tag: "Sources",
          });
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
        logger.info("Total sources", {
          tag: "Sources",
          total: allSources.length,
          perplexity: perplexitySourceCount,
          webSearch: webSearchSources.length,
        });
      }

      // Handle image generation (files in result)
      // This supports Gemini image models called via standard chat
      try {
        const files = await result.files;
        if (files && files.length > 0) {
          logger.info("Processing generated files", {
            tag: "Generation",
            count: files.length,
          });

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
              logger.warn("Unknown file format", {
                tag: "Generation",
                file: JSON.stringify(file),
              });
              continue;
            }

            // Store in Convex file storage
            const storageId = await ctx.storage.store(
              new Blob([imageBytes as any], { type: "image/png" }),
            );

            // Add attachment to message
            await ctx.runMutation(internal.messages.addAttachment, {
              messageId: assistantMessageId,
              attachment: {
                type: "image",
                storageId,
                name: "generated-image.png",
                size: imageBytes.byteLength,
                mimeType: "image/png",
                metadata: {
                  prompt: lastUserMsg?.content || "",
                  model: modelId,
                  generationTime: Date.now() - generationStartTime,
                },
              },
            });
          }
        }
      } catch (error) {
        logger.error("Error processing generated files", {
          tag: "Generation",
          error: String(error),
        });
      }

      // 9. Finalize tool calls (Phase 1: mark partials as complete)
      if (allToolCalls.length > 0) {
        (await (ctx.runMutation as any)(internal.messages.finalizeToolCalls, {
          messageId: assistantMessageId,
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
            messageId: assistantMessageId,
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
        { messageId: assistantMessageId },
      )) as { status?: string } | null;

      if (finalCheck?.status !== "stopped") {
        // Store reasoning if present - models may return it natively even without config
        await ctx.runMutation(internal.messages.completeMessage, {
          messageId: assistantMessageId,
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
          model: modelId,
          messageId: assistantMessageId,
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

      // 11. POST-STREAMING CLEANUP (parallelized for speed)
      // These operations don't need to block action completion - run in parallel

      // Get conversation for title check (needed for conditional title gen)
      const conversationForTitle = await ctx.runQuery(
        internal.conversations.getInternal,
        { id: args.conversationId },
      );

      // System prompts (tool-based memory retrieval tokens counted separately by AI SDK)
      const systemPromptStrings: string[] = systemPrompts.map((msg) =>
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      );

      // Get last user message for model triage
      const lastUserMsgForTriage = messages
        .filter((m: Doc<"messages">) => m.role === "user")
        .sort(
          (a: Doc<"messages">, b: Doc<"messages">) => b.createdAt - a.createdAt,
        )[0];

      // PARALLEL: Run all post-streaming work concurrently
      await Promise.all([
        // Token counting and updates
        (async () => {
          const allMessagesForCounting = await ctx.runQuery(
            internal.messages.listInternal,
            { conversationId: args.conversationId },
          );
          const tokenUsage = await calculateConversationTokensAsync(
            systemPromptStrings,
            memoryContentForTracking ? [memoryContentForTracking] : [],
            allMessagesForCounting,
            modelConfig.contextWindow,
            modelId,
          );
          // Run both token updates in parallel
          await Promise.all([
            ctx.runMutation(internal.conversations.updateTokenUsage, {
              conversationId: args.conversationId,
              tokenUsage,
            }),
            (ctx.runMutation as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.conversations.updateConversationTokenUsage,
              {
                conversationId: args.conversationId,
                model: modelId,
                inputTokens,
                outputTokens,
                reasoningTokens: reasoningTokens || 0,
              },
            ),
          ]);
        })(),

        // Auto-name if conversation still has default title
        conversationForTitle?.title === "New Chat"
          ? ctx.scheduler.runAfter(0, internal.ai.generateTitle.generateTitle, {
              conversationId: args.conversationId,
            })
          : Promise.resolve(),

        // Model triage analysis (skip if auto-selected - system already optimized)
        lastUserMsgForTriage && !_wasAutoSelected
          ? ctx.scheduler.runAfter(0, internal.ai.modelTriage.analyzeModelFit, {
              conversationId: args.conversationId,
              userMessage: lastUserMsgForTriage.content,
              currentModelId: modelId,
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      // Handle AbortError (user stopped generation) - clean exit
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("Generation stopped by user", {
          tag: "Generation",
          messageId: assistantMessageId,
        });
        return; // Clean exit - message already marked stopped
      }

      // Enhanced error logging to capture full gateway error details
      logger.error("Generation error", {
        tag: "Generation",
        error: String(error),
      });

      // Extract and log full responseBody from gateway errors for debugging
      const causeObj = (error as any)?.cause || {};
      if (causeObj.responseBody) {
        try {
          const parsedBody = JSON.parse(causeObj.responseBody);
          logger.error("Full gateway error", {
            tag: "Generation",
            statusCode: causeObj.statusCode || (error as any).statusCode,
            model: args.modelId,
            errorMessage: parsedBody?.error?.message,
            fullResponse: parsedBody,
          });
        } catch {
          logger.error("Raw gateway responseBody", {
            tag: "Generation",
            responseBody: causeObj.responseBody,
          });
        }
      }

      // Classify error type for AI-specific tracking
      const errorType =
        error instanceof Error ? classifyStreamingError(error) : "unknown";
      const isCreditsError = detectCreditsError(error);

      // Calculate wasted cost if streaming failed mid-generation
      // Includes both input tokens (conversation context) and output tokens (partial response)
      const modelConfig = getModelConfig(args.modelId);
      const wastedCost =
        firstTokenTime && modelConfig?.pricing
          ? estimateWastedCost(
              inputTokenEstimate,
              estimateTokens(accumulated),
              {
                input: modelConfig.pricing.input,
                output: modelConfig.pricing.output,
              },
            )
          : 0;

      // Comprehensive error tracking with AI-specific context
      await captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: args.userId,
          conversationId: args.conversationId,
          messageId: assistantMessageId,
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

      logger.error("Generation error", {
        tag: "Generation",
        error: String(error),
      });

      await ctx.runMutation(internal.messages.markError, {
        messageId: assistantMessageId,
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
