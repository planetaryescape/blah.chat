import { getModelConfig, type ModelConfig } from "@/lib/ai/models";
import { calculateCost } from "@/lib/ai/pricing";
import { getModel } from "@/lib/ai/registry";
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, streamText, type CoreMessage } from "ai";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { buildBasePromptOptions, getBasePrompt } from "./lib/prompts/base";
import {
  formatMemoriesByCategory,
  truncateMemories,
} from "./lib/prompts/formatting";
import { calculateConversationTokensAsync } from "./tokens/counting";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export * as image from "./generation/image";

/**
 * Classifies message to determine memory retrieval strategy
 * Returns limit: 0 (skip), 3 (minimal), 10 (full)
 */
function getMemoryLimit(content: string): number {
  // Always retrieve for long/complex messages
  if (content.length > 100) return 10;

  // Explicit memory references
  const memoryKeywords =
    /\b(remember|recall|you (said|mentioned|told)|we (discussed|talked)|earlier|before|previous|last time|my (preference|project|usual))\b/i;
  if (memoryKeywords.test(content)) return 10;

  // Context questions
  const contextQuestions =
    /\b(what|when|where|why|how) (did|do|does|is|was|were|can|should)\b/i;
  if (contextQuestions.test(content)) return 10;

  // Continuation words (minimal context)
  const continuations =
    /^(yes|no|ok|sure|continue|go on|tell me more|what else|and\?|explain|elaborate)\b/i;
  if (continuations.test(content) && content.length > 20) return 3;

  // Very short messages (greetings, acknowledgments) - skip
  if (content.length < 20) return 0;

  // Default: minimal retrieval for unknown patterns
  return 3;
}

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

// Helper function to build system prompts from multiple sources
async function buildSystemPrompts(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    conversationId: Id<"conversations">;
    userMessage: string;
    modelConfig: ModelConfig;
  },
): Promise<{ messages: CoreMessage[]; memoryContent: string | null }> {
  const systemMessages: CoreMessage[] = [];
  let memoryContentForTracking: string | null = null;

  // 1. User custom instructions (highest priority)
  // @ts-ignore
  const user = await ctx.runQuery(api.users.getCurrentUser, {});
  if (user?.preferences?.customInstructions?.enabled) {
    const { aboutUser, responseStyle } = user.preferences.customInstructions;
    systemMessages.push({
      role: "system",
      content: `About the user:\n${aboutUser}\n\nResponse style:\n${responseStyle}`,
    });
  }

  // 2. Project context (if conversation is in a project)
  // @ts-ignore
  const conversation = await ctx.runQuery(internal.conversations.getInternal, {
    id: args.conversationId,
  });

  if (conversation?.projectId) {
    const project = await ctx.runQuery(internal.projects.getInternal, {
      id: conversation.projectId,
    });
    if (project?.systemPrompt) {
      systemMessages.push({
        role: "system",
        content: `Project: ${project.systemPrompt}`,
      });
    }
  }

  // 3. Conversation-level system prompt
  if (conversation?.systemPrompt) {
    systemMessages.push({
      role: "system",
      content: conversation.systemPrompt,
    });
  }

  // 4. Memory retrieval (pre-fetch approach with selective retrieval + caching)
  if (args.userMessage) {
    try {
      // Phase 2B: Caching + selective retrieval
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
      const memoryLimit = 3; // Always fetch 3 critical memories (tool handles rest)
      let memories: any[] = [];

      if (memoryLimit > 0) {
        // Check cache validity
        const now = Date.now();
        const cacheValid =
          conversation?.cachedMemoryIds &&
          conversation?.lastMemoryFetchAt &&
          now - conversation.lastMemoryFetchAt < CACHE_TTL_MS;

        if (cacheValid) {
          // Cache HIT - fetch full docs from IDs
          const cachedIds = conversation!.cachedMemoryIds!;
          // @ts-ignore
          memories = (
            await Promise.all(
              cachedIds.map((id: Id<"memories">) =>
                ctx.runQuery(internal.memories.getMemoryById, { id }),
              ),
            )
          ).filter((m: Doc<"memories"> | null) => m !== null);

          console.log(
            `[Memory] Cache HIT: ${memories.length} memories, age=${Math.round((now - conversation!.lastMemoryFetchAt!) / 1000)}s`,
          );
        } else {
          // Cache MISS - fetch fresh + update cache
          // @ts-ignore
          memories = await ctx.runAction(
            internal.memories.search.hybridSearch,
            {
              userId: args.userId,
              query: args.userMessage,
              limit: memoryLimit,
            },
          );

          // Store IDs in cache
          const memoryIds = memories.map((m) => m._id);
          // @ts-ignore
          await ctx.runMutation(internal.conversations.updateMemoryCache, {
            id: args.conversationId,
            cachedMemoryIds: memoryIds,
            lastMemoryFetchAt: now,
          });

          console.log(
            `[Memory] Cache MISS: fetched ${memories.length} memories, limit=${memoryLimit}`,
          );
        }
      } else {
        console.log(
          `[Memory] Skipped retrieval: "${args.userMessage.slice(0, 50)}..."`,
        );
      }

      console.log(`[Memory] Found ${memories.length} memories`);

      if (memories.length > 0) {
        // Calculate 15% budget
        const maxMemoryTokens = Math.floor(
          args.modelConfig.contextWindow * 0.15,
        );
        console.log(
          `[Memory] Budget: ${maxMemoryTokens} tokens (15% of ${args.modelConfig.contextWindow})`,
        );

        // Truncate by priority
        const truncated = truncateMemories(memories, maxMemoryTokens);
        console.log(
          `[Memory] Truncated ${memories.length} → ${truncated.length} memories`,
        );

        memoryContentForTracking = formatMemoriesByCategory(truncated);
        console.log(
          "[Memory] Formatted content length:",
          memoryContentForTracking.length,
        );
        console.log("[Memory] Formatted content:", memoryContentForTracking);

        if (memoryContentForTracking) {
          systemMessages.push({
            role: "system",
            content: memoryContentForTracking,
          });
          console.log("[Memory] Injected memories into system prompt");
        }
      } else {
        console.log("[Memory] No memories found for query");
      }
    } catch (error) {
      console.error("[Memory] Fetch failed:", error);
      // Continue without memories (graceful degradation)
    }
  }

  // 5. Base identity (foundation)
  const basePromptOptions = buildBasePromptOptions(args.modelConfig);
  const basePrompt = getBasePrompt(basePromptOptions);

  systemMessages.push({
    role: "system",
    content: basePrompt,
  });

  return { messages: systemMessages, memoryContent: memoryContentForTracking };
}

export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    modelId: v.string(),
    userId: v.id("users"),
    thinkingEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    systemPromptOverride: v.optional(v.string()), // For consolidation
  },
  handler: async (ctx, args) => {
    // Timing variables for performance metrics
    const generationStartTime = Date.now();
    let firstTokenTime: number | undefined;

    try {
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

      // 2. Get conversation history
      const messages = await ctx.runQuery(internal.messages.listInternal, {
        conversationId: args.conversationId,
      });

      // 3. Get last user message for memory retrieval
      const lastUserMsg = messages
        .filter((m: Doc<"messages">) => m.role === "user")
        .sort(
          (a: Doc<"messages">, b: Doc<"messages">) => b.createdAt - a.createdAt,
        )[0];

      // 4. Get model config
      const modelConfig = getModelConfig(args.modelId);
      if (!modelConfig) {
        throw new Error(`Model ${args.modelId} not found in configuration`);
      }

      // 5. Build system prompts (or use override for consolidation)
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
          });

      const systemPrompts = systemPromptsResult.messages;
      const memoryContentForTracking = systemPromptsResult.memoryContent;

      // 6. Check for vision capability
      const hasVision = modelConfig.capabilities?.includes("vision") ?? false;

      // 6. Filter and transform conversation history (with attachments if vision model)
      const history = await Promise.all(
        messages
          .filter(
            (m: Doc<"messages">) =>
              m._id !== args.assistantMessageId && m.status === "complete",
          )
          .map(async (m: Doc<"messages">) => {
            // Text-only messages (no attachments)
            if (!m.attachments || m.attachments.length === 0) {
              return {
                role: m.role as "user" | "assistant" | "system",
                content: m.content || "",
              };
            }

            // Messages with attachments - only if vision model
            if (!hasVision) {
              // Non-vision models: text only, ignore attachments
              return {
                role: m.role as "user" | "assistant" | "system",
                content: m.content || "",
              };
            }

            // Vision models: build content array with text + attachments
            const contentParts: any[] = [
              { type: "text", text: m.content || "" },
            ];

            for (const attachment of m.attachments) {
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
                // PDFs (Anthropic Claude + Google Gemini support)
                contentParts.push({
                  type: "file",
                  data: base64,
                  mediaType: attachment.mimeType,
                  filename: attachment.name,
                });
              }
              // Future: audio support
            }

            return {
              role: m.role as "user" | "assistant" | "system",
              content: contentParts,
            };
          }),
      );

      // 7. Combine: system prompts FIRST, then history
      const allMessages = [...systemPrompts, ...history];

      // 8. Build reasoning options (unified for all providers)
      const reasoningResult =
        args.thinkingEffort && modelConfig?.reasoning
          ? buildReasoningOptions(modelConfig, args.thinkingEffort)
          : null;

      // 9. Get model (with Responses API if needed for OpenAI)
      const model = getModel(args.modelId, reasoningResult?.useResponsesAPI);

      // 10. Apply middleware (e.g., DeepSeek tag extraction)
      const finalModel = reasoningResult?.applyMiddleware
        ? reasoningResult.applyMiddleware(model)
        : model;

      // 11. Build streamText options
      const options: any = {
        model: finalModel,
        messages: allMessages,
        maxSteps: 5,
        onStepFinish: async (step) => {
          // No-op: tools disabled, keeping callback for future use
        },
      };

      // 13. Apply provider options (single source!)
      if (reasoningResult?.providerOptions) {
        options.providerOptions = reasoningResult.providerOptions;
        console.log(
          `[Reasoning] Applied provider options for ${args.modelId}:`,
          reasoningResult.providerOptions,
        );
      }

      // 14. Apply headers (e.g., Anthropic beta)
      if (reasoningResult?.headers) {
        options.headers = reasoningResult.headers;
      }

      // 14. Detect if reasoning model (check config, not flags)
      const isReasoningModel = !!modelConfig?.reasoning;

      // Mark thinking phase started for reasoning models
      if (isReasoningModel && args.thinkingEffort) {
        await ctx.runMutation(internal.messages.markThinkingStarted, {
          messageId: args.assistantMessageId,
        });
      }

      // 6. Accumulate chunks, throttle DB updates
      let accumulated = "";
      let reasoningBuffer = "";

      // Stream from LLM
      const result = streamText(options);
      let lastUpdate = Date.now();
      let lastReasoningUpdate = Date.now();
      const UPDATE_INTERVAL = 200; // ms

      for await (const chunk of result.fullStream) {
        const now = Date.now();

        // Handle reasoning chunks
        if (chunk.type === "reasoning-delta") {
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
            await ctx.runMutation(internal.messages.updatePartialContent, {
              messageId: args.assistantMessageId,
              partialContent: accumulated,
            });
            lastUpdate = now;
          }
        }
      }

      // 7. Get token usage
      const usage = await result.usage;

      // Complete thinking if reasoning present
      const reasoningOutputs = await result.reasoning;
      console.log(
        `[Reasoning] Model: ${args.modelId}, Outputs:`,
        reasoningOutputs,
      );
      const finalReasoning =
        reasoningOutputs && reasoningOutputs.length > 0
          ? reasoningOutputs.map((r) => r.text).join("\n")
          : undefined;

      console.log(
        `[Reasoning] Final reasoning length: ${finalReasoning?.length || 0}, reasoning tokens: ${usage.reasoningTokens || 0}`,
      );

      if (finalReasoning && finalReasoning.trim().length > 0) {
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

      const cost = calculateCost(
        args.modelId,
        inputTokens,
        outputTokens,
        undefined, // cachedTokens
        reasoningTokens,
      );

      // Calculate TPS (tokens per second)
      const endTime = Date.now();
      const durationSeconds = (endTime - generationStartTime) / 1000;
      const tokensPerSecond =
        outputTokens && durationSeconds > 0
          ? outputTokens / durationSeconds
          : undefined;

      // 9. Final completion
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.assistantMessageId,
        content: accumulated,
        reasoning: finalReasoning,
        inputTokens,
        outputTokens,
        reasoningTokens,
        cost,
        tokensPerSecond,
      });

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

      await ctx.runMutation(internal.conversations.updateTokenUsage, {
        conversationId: args.conversationId,
        tokenUsage,
      });

      // 12. Auto-name if conversation still has default title
      const conversation = await ctx.runQuery(
        internal.conversations.getInternal,
        {
          id: args.conversationId,
        },
      );

      if (conversation && conversation.title === "New Chat") {
        // Still has default title, schedule title generation
        await ctx.scheduler.runAfter(
          0,
          internal.ai.generateTitle.generateTitle,
          {
            conversationId: args.conversationId,
          },
        );
      }
    } catch (error) {
      await ctx.runMutation(internal.messages.markError, {
        messageId: args.assistantMessageId,
        error: error instanceof Error ? error.message : "Unknown error",
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
  handler: async (ctx, args) => {
    // Create abort controller with 30s timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      // Generate summary using Grok 4.1 Fast
      const result = await generateText({
        model: openrouter("x-ai/grok-4.1-fast"),
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that provides concise summaries. Summarize the following text in 1-2 sentences, focusing on the key points.",
          },
          {
            role: "user",
            content: `Summarize this text:\n\n${args.text}`,
          },
        ],
        abortSignal: abortController.signal,
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
