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
import { createMemorySearchTool } from "./ai/tools/memories";
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
    hasFunctionCalling: boolean;
    prefetchedMemories: string | null;
  },
): Promise<{ messages: CoreMessage[]; memoryContent: string | null }> {
  const systemMessages: CoreMessage[] = [];
  let memoryContentForTracking: string | null = null;

  // Parallelize context queries (user, project, conversation)
  const [user, conversation] = await Promise.all([
    // @ts-ignore
    ctx.runQuery(api.users.getCurrentUser, {}),
    // @ts-ignore
    ctx.runQuery(internal.conversations.getInternal, {
      id: args.conversationId,
    }),
  ]);

  // 1. User custom instructions (highest priority)
  if (user?.preferences?.customInstructions?.enabled) {
    const { aboutUser, responseStyle } = user.preferences.customInstructions;
    systemMessages.push({
      role: "system",
      content: `About the user:\n${aboutUser}\n\nResponse style:\n${responseStyle}`,
    });
  }

  // 2. Project context (if conversation is in a project)
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

  // 4. Identity memories (always loaded, instant)
  try {
    // @ts-ignore
    const identityMemories: Doc<"memories">[] = await ctx.runQuery(
      internal.memories.search.getIdentityMemories,
      {
        userId: args.userId,
        limit: 20,
      },
    );

    console.log(
      `[Identity] Loaded ${identityMemories.length} identity memories`,
    );

    if (identityMemories.length > 0) {
      // Calculate 10% budget for identity memories (conservative)
      const maxMemoryTokens = Math.floor(args.modelConfig.contextWindow * 0.1);

      // Truncate by priority
      const truncated = truncateMemories(identityMemories, maxMemoryTokens);
      console.log(
        `[Identity] Truncated ${identityMemories.length} → ${truncated.length} memories`,
      );

      memoryContentForTracking = formatMemoriesByCategory(truncated);

      if (memoryContentForTracking) {
        systemMessages.push({
          role: "system",
          content: `## Identity & Preferences\n\n${memoryContentForTracking}`,
        });
        console.log("[Identity] Injected identity memories into system prompt");
      }
    }
  } catch (error) {
    console.error("[Identity] Failed to load identity memories:", error);
    // Continue without memories (graceful degradation)
  }

  // 5. Contextual memories (for non-tool models only)
  if (args.prefetchedMemories) {
    systemMessages.push({
      role: "system",
      content: `## Contextual Memories\n\n${args.prefetchedMemories}`,
    });
    console.log(
      "[Contextual Memories] Injected pre-fetched memories into system prompt",
    );
  }

  // 6. Base identity (foundation)
  const basePromptOptions = {
    ...buildBasePromptOptions(args.modelConfig),
    hasFunctionCalling: args.hasFunctionCalling,
    prefetchedMemories: args.prefetchedMemories,
  };
  const basePrompt = getBasePrompt(basePromptOptions);

  systemMessages.push({
    role: "system",
    content: basePrompt,
  });

  return { messages: systemMessages, memoryContent: memoryContentForTracking };
}

// Helper function to extract sources/citations from AI SDK response
// Perplexity models (via OpenRouter) return search results in metadata
function extractSources(result: any):
  | Array<{
      id: string;
      title: string;
      url: string;
      publishedDate?: string;
      snippet?: string;
    }>
  | undefined {
  try {
    // Check experimental provider metadata (AI SDK standard location)
    const providerMeta =
      result.experimental_providerMetadata?.openrouter ||
      result.experimental_providerMetadata;

    if (
      providerMeta?.search_results &&
      Array.isArray(providerMeta.search_results)
    ) {
      return providerMeta.search_results.map((r: any, i: number) => ({
        id: `${i + 1}`, // Sequential IDs for citation markers
        title: r.title || r.name || "Untitled Source",
        url: r.url,
        publishedDate: r.date || r.published_date,
        snippet: r.snippet || r.description,
      }));
    }

    // Fallback: check raw response for search_results
    const rawSources =
      result.rawResponse?.search_results || result.citations || result.sources;

    if (rawSources && Array.isArray(rawSources)) {
      return rawSources.map((r: any, i: number) => ({
        id: `${i + 1}`,
        title: r.title || r.name || "Untitled Source",
        url: r.url,
        publishedDate: r.date || r.published_date,
        snippet: r.snippet || r.description,
      }));
    }

    // No sources found
    return undefined;
  } catch (error) {
    console.warn("[Sources] Failed to extract sources:", error);
    return undefined;
  }
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

      // 5. Check for vision and function-calling capabilities
      const hasVision = modelConfig.capabilities?.includes("vision") ?? false;
      const hasFunctionCalling =
        modelConfig.capabilities?.includes("function-calling") ?? false;

      console.log(
        `[Tools] Model ${args.modelId} function-calling: ${hasFunctionCalling}`,
      );

      // 6. Pre-fetch contextual memories for non-tool models
      let prefetchedMemories: string | null = null;

      if (!hasFunctionCalling && lastUserMsg) {
        try {
          // Build search query from last user message (content is a string)
          const searchQuery = (lastUserMsg.content || "").slice(0, 500); // Cap query length

          if (searchQuery.trim()) {
            console.log(
              `[Memory Pre-fetch] Searching for non-tool model: "${searchQuery.slice(0, 50)}..."`,
            );

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
              (m) =>
                !["identity", "preference", "relationship"].includes(
                  m.metadata?.category,
                ),
            );

            if (contextMemories.length > 0) {
              // Format for system prompt injection
              const memoryTokenBudget = Math.floor(
                modelConfig.contextWindow * 0.15,
              );
              const memoryCharBudget = memoryTokenBudget * 4;

              let formatted = contextMemories
                .map((m) => {
                  const cat = m.metadata?.category || "general";
                  const timestamp = new Date(
                    m._creationTime,
                  ).toLocaleDateString();
                  return `[${cat}] (${timestamp}) ${m.content}`;
                })
                .join("\n\n");

              // Truncate if exceeds budget
              if (formatted.length > memoryCharBudget) {
                formatted =
                  formatted.slice(0, memoryCharBudget) +
                  "\n\n[...truncated for token limit]";
              }

              prefetchedMemories = formatted;
              console.log(
                `[Memory Pre-fetch] Loaded ${contextMemories.length} memories (${formatted.length} chars)`,
              );
            } else {
              console.log(`[Memory Pre-fetch] No contextual memories found`);
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
        maxSteps: hasFunctionCalling ? 5 : 1, // No multi-turn for non-tool models
      };

      // Only add tools for capable models
      if (hasFunctionCalling) {
        const memoryTool = createMemorySearchTool(ctx, args.userId);

        options.tools = {
          searchMemories: memoryTool,
        };

        options.onStepFinish = async (step: any) => {
          console.log(
            "[Tool] Step finished:",
            step.stepType,
            step.toolCalls?.length,
          );

          if (step.toolCalls && step.toolCalls.length > 0) {
            const completedCalls = step.toolCalls.map((tc: any) => ({
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

            console.log("[Tool] Completed calls:", completedCalls);
            // Phase 2 will add immediate persistence here
          }
        };
      }

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
          });

          // Immediately persist for loading state UI
          await ctx.runMutation(internal.messages.updatePartialToolCalls, {
            messageId: args.assistantMessageId,
            partialToolCalls: Array.from(toolCallsBuffer.values()),
          });
        }

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

      // Extract all tool calls from result.steps
      const steps = (await result.steps) || [];
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
            result: stepResult ? JSON.stringify(stepResult.result) : undefined,
            timestamp: Date.now(),
          };
        });

      console.log("[Tool] All tool calls to persist:", allToolCalls.length);

      // Extract sources from response (Perplexity, web search models)
      const sources = extractSources(result);
      if (sources) {
        console.log(
          `[Sources] Extracted ${sources.length} sources from response`,
        );
      }

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
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        sources,
      });

      // Trigger OpenGraph enrichment for sources (background job)
      if (sources && sources.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.sources.enrichment.enrichSourceMetadata,
          {
            messageId: args.assistantMessageId,
            sources: sources.map((s) => ({ id: s.id, url: s.url })),
          },
        );
        console.log(
          `[Sources] Scheduled OpenGraph enrichment for ${sources.length} sources`,
        );
      }

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
