import { type CoreMessage, generateText, stepCountIs, streamText } from "ai";
import { v } from "convex/values";
import { aiGateway, getGatewayOptions } from "@/lib/ai/gateway";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { getModel } from "@/lib/ai/registry";
import {
  calculateCost,
  getModelConfig,
  type ModelConfig,
} from "@/lib/ai/utils";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import { createCalculatorTool } from "./ai/tools/calculator";
import { createCodeExecutionTool } from "./ai/tools/codeExecution";
import { createDateTimeTool } from "./ai/tools/datetime";
import { createFileDocumentTool } from "./ai/tools/fileDocument";
import {
  createMemorySaveTool,
  createMemorySearchTool,
} from "./ai/tools/memories";
import { createUrlReaderTool } from "./ai/tools/urlReader";
import { createWebSearchTool } from "./ai/tools/webSearch";
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
    ctx.runQuery(api.users.getCurrentUser, {}),
    ctx.runQuery(internal.conversations.getInternal, {
      id: args.conversationId,
    }),
  ]);

  // 1. User custom instructions (highest priority)
  if (user?.preferences?.customInstructions?.enabled) {
    const {
      aboutUser,
      responseStyle,
      baseStyleAndTone,
      nickname,
      occupation,
      moreAboutYou,
    } = user.preferences.customInstructions;

    // Build personalization sections
    const sections: string[] = [];

    // User identity section
    const identityParts: string[] = [];
    if (nickname) identityParts.push(`Name: ${nickname}`);
    if (occupation) identityParts.push(`Role: ${occupation}`);
    if (identityParts.length > 0) {
      sections.push(`## User Identity\n${identityParts.join("\n")}`);
    }

    // About the user
    if (aboutUser || moreAboutYou) {
      const aboutSections: string[] = [];
      if (aboutUser) aboutSections.push(aboutUser);
      if (moreAboutYou) aboutSections.push(moreAboutYou);
      sections.push(`## About the User\n${aboutSections.join("\n\n")}`);
    }

    // Response style
    if (responseStyle) {
      sections.push(`## Response Style\n${responseStyle}`);
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
        sections.push(`## Tone Directive\n${toneDirective}`);
      }
    }

    if (sections.length > 0) {
      systemMessages.push({
        role: "system",
        content: sections.join("\n\n"),
      });
    }
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
    const identityMemories: Doc<"memories">[] = await ctx.runQuery(
      internal.memories.search.getIdentityMemories,
      {
        userId: args.userId,
        limit: 20,
      },
    );

    if (identityMemories.length > 0) {
      // Calculate 10% budget for identity memories (conservative)
      const maxMemoryTokens = Math.floor(args.modelConfig.contextWindow * 0.1);

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

  // 5. Contextual memories (for non-tool models only)
  if (args.prefetchedMemories) {
    systemMessages.push({
      role: "system",
      content: `## Contextual Memories\n\n${args.prefetchedMemories}`,
    });
  }

  // 6. Base identity (foundation) - with dynamic date injection
  const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  const basePromptOptions = {
    modelConfig: args.modelConfig,
    hasFunctionCalling: args.hasFunctionCalling,
    prefetchedMemories: args.prefetchedMemories,
    currentDate,
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
// Helper function to extract sources/citations from AI SDK response
// Perplexity models (via OpenRouter) return search results in metadata
function extractSources(providerMetadata: any):
  | Array<{
      id: string;
      title: string;
      url: string;
      publishedDate?: string;
      snippet?: string;
    }>
  | undefined {
  if (!providerMetadata) return undefined;

  try {
    // Check experimental provider metadata (AI SDK standard location)
    // Note: When passed directly, providerMetadata IS the metadata object
    const openRouterMeta = providerMetadata.openrouter || providerMetadata;

    // 1. OpenRouter / Perplexity format
    if (
      openRouterMeta?.search_results &&
      Array.isArray(openRouterMeta.search_results)
    ) {
      return openRouterMeta.search_results.map((r: any, i: number) => ({
        id: `${i + 1}`, // Sequential IDs for citation markers
        title: r.title || r.name || "Untitled Source",
        url: r.url,
        publishedDate: r.date || r.published_date,
        snippet: r.snippet || r.description,
      }));
    }

    // 2. Perplexity Native (official provider)
    const perplexityMeta = providerMetadata.perplexity || providerMetadata;
    const perplexitySources = perplexityMeta?.citations;

    if (perplexitySources && Array.isArray(perplexitySources)) {
      return perplexitySources
        .map((r: any, i: number) => {
          if (typeof r === "string") {
            return {
              id: `${i + 1}`,
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            id: `${i + 1}`,
            title: r.title || "Untitled Source",
            url: r.url,
            snippet: r.snippet,
          };
        })
        .filter((s) => s.url);
    }

    // 3. Generic Citations/Sources (OpenRouter/Other)
    const genericSources =
      openRouterMeta?.citations ||
      openRouterMeta?.sources ||
      providerMetadata?.citations ||
      providerMetadata?.sources ||
      // Sometimes it might be deeply nested in a 'extra' or similar field
      (providerMetadata as any)?.extra?.citations;

    if (genericSources && Array.isArray(genericSources)) {
      return genericSources
        .map((r: any, i: number) => {
          if (typeof r === "string") {
            return {
              id: `${i + 1}`,
              title: r,
              url: r,
              snippet: undefined,
              publishedDate: undefined,
            };
          }
          return {
            id: `${i + 1}`,
            title: r.title || r.name || "Untitled Source",
            url: r.url || r.uri || "",
            publishedDate: r.date || r.published_date,
            snippet: r.snippet || r.description,
          };
        })
        .filter((s) => s.url && s.url.length > 0);
    }

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
      const messageAttachments = lastUserMsg?.attachments;

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
            // Text-only messages (no attachments)
            if (!m.attachments || m.attachments.length === 0) {
              return {
                role: m.role as "user" | "assistant" | "system",
                content: m.content || "",
                providerMetadata: m.providerMetadata,
              };
            }

            // Messages with attachments - only if vision model
            if (!hasVision) {
              // Non-vision models: text only, ignore attachments
              return {
                role: m.role as "user" | "assistant" | "system",
                content: m.content || "",
                providerMetadata: m.providerMetadata,
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
              providerMetadata: m.providerMetadata,
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
        stopWhen: hasFunctionCalling ? stepCountIs(5) : undefined, // Multi-step tool calling
        providerOptions: getGatewayOptions(args.modelId, args.userId, ["chat"]),
      };

      // Only add tools for capable models
      if (hasFunctionCalling) {
        const memorySearchTool = createMemorySearchTool(ctx, args.userId);
        const memorySaveTool = createMemorySaveTool(ctx, args.userId);
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

        options.tools = {
          searchMemories: memorySearchTool,
          saveMemory: memorySaveTool,
          calculator: calculatorTool,
          datetime: dateTimeTool,
          webSearch: webSearchTool,
          urlReader: urlReaderTool,
          fileDocument: fileDocumentTool,
          codeExecution: codeExecutionTool,
        };

        options.onStepFinish = async (step: any) => {
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
            textPosition: accumulated.length, // Track where in text this tool was called
          });

          // Immediately persist for loading state UI
          await ctx.runMutation(internal.messages.updatePartialToolCalls, {
            messageId: args.assistantMessageId,
            partialToolCalls: Array.from(toolCallsBuffer.values()),
          });
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

            // Persist result immediately so frontend can show it
            await ctx.runMutation(internal.messages.updatePartialToolCalls, {
              messageId: args.assistantMessageId,
              partialToolCalls: Array.from(toolCallsBuffer.values()),
            });
          }
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

      // Get final usage info
      const usage = await result.usage;

      // Complete thinking if reasoning present
      const reasoningOutputs = await result.reasoning;
      const finalReasoning =
        reasoningOutputs && reasoningOutputs.length > 0
          ? reasoningOutputs.map((r) => r.text).join("\n")
          : undefined;

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
      // Must pass the resolved providerMetadata, not the stream result
      const sources = extractSources(providerMetadata);

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
        providerMetadata,
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
  handler: async (ctx, args) => {
    // Create abort controller with 30s timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      // Generate summary using GPT-OSS 120B via gateway
      // TODO: Move this model config to constants or arguments
      const summarizationModel = MODEL_CONFIG["openai:gpt-oss-120b"];
      const result = await generateText({
        model: aiGateway(summarizationModel.id),
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
