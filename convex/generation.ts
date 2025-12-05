import { getModelConfig, type ModelConfig } from "@/lib/ai/models";
import { calculateCost } from "@/lib/ai/pricing";
import { getModel } from "@/lib/ai/registry";
import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { buildBasePromptOptions, getBasePrompt } from "./lib/prompts/base";
import { formatMemoriesByCategory } from "./lib/prompts/formatting";
import { calculateConversationTokens } from "./tokens/counting";

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
  },
): Promise<CoreMessage[]> {
  const systemMessages: CoreMessage[] = [];

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

  // 4. Memory retrieval (pre-fetch approach)
  if (args.userMessage) {
    try {
      console.log(
        "[Memory] Searching for memories with query:",
        args.userMessage,
      );
      // @ts-ignore
      const memories = await ctx.runAction(
        internal.memories.search.hybridSearch,
        {
          userId: args.userId,
          query: args.userMessage,
          limit: 10,
        },
      );

      console.log(`[Memory] Found ${memories.length} memories`);

      if (memories.length > 0) {
        const memoryContent = formatMemoriesByCategory(memories);
        console.log("[Memory] Formatted content length:", memoryContent.length);
        console.log("[Memory] Formatted content:", memoryContent);

        if (memoryContent) {
          systemMessages.push({
            role: "system",
            content: memoryContent,
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

  return systemMessages;
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
  },
  handler: async (ctx, args) => {
    try {
      // 1. Mark generation started
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId: args.assistantMessageId,
        partialContent: "",
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

      // 5. Build system prompts (NEW)
      const systemPrompts = await buildSystemPrompts(ctx, {
        userId: args.userId,
        conversationId: args.conversationId,
        userMessage: lastUserMsg?.content || "",
        modelConfig,
      });

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

      // 8. Get model from registry
      const model = getModel(args.modelId);

      // 9. Build streamText options
      const options: any = {
        model,
        messages: allMessages,
      };

      // OpenAI o1/o3 reasoning effort
      if (args.thinkingEffort && args.modelId.startsWith("openai:o")) {
        options.providerOptions = {
          openai: {
            reasoningEffort: args.thinkingEffort,
          },
        };
      }

      // Anthropic extended thinking budget
      if (
        args.thinkingEffort &&
        modelConfig?.capabilities.includes("extended-thinking")
      ) {
        const budgets = { low: 5000, medium: 15000, high: 30000 };
        options.providerOptions = {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: budgets[args.thinkingEffort],
            },
          },
        };
        options.headers = {
          "anthropic-beta": "interleaved-thinking-2025-05-14",
        };
      }

      // 6. Accumulate chunks, throttle DB updates
      let accumulated = "";

      // Stream from LLM
      const result = streamText(options);
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 200; // ms

      for await (const chunk of result.textStream) {
        accumulated += chunk;

        const now = Date.now();
        if (now - lastUpdate >= UPDATE_INTERVAL) {
          await ctx.runMutation(internal.messages.updatePartialContent, {
            messageId: args.assistantMessageId,
            partialContent: accumulated,
          });
          lastUpdate = now;
        }
      }

      // 7. Get token usage
      const usage = await result.usage;

      // 8. Calculate cost
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;

      const cost = calculateCost(args.modelId, inputTokens, outputTokens);

      // 9. Final completion
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.assistantMessageId,
        content: accumulated,
        inputTokens,
        outputTokens,
        cost,
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

      const tokenUsage = calculateConversationTokens(
        systemPromptStrings,
        [], // No memory prompts - now accessed via tools
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
