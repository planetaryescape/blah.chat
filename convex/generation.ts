import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { streamText, type CoreMessage } from "ai";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/pricing";
import { getModelConfig } from "@/lib/ai/models";

// Helper function to build system prompts from multiple sources
async function buildSystemPrompts(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    conversationId: Id<"conversations">;
    userMessage: string;
  },
): Promise<CoreMessage[]> {
  const systemMessages: CoreMessage[] = [];

  // 1. User custom instructions (global)
  const user = await ctx.runQuery(api.users.getCurrentUser, {});
  if (user?.preferences?.customInstructions?.enabled) {
    const { aboutUser, responseStyle } = user.preferences.customInstructions;
    systemMessages.push({
      role: "system",
      content: `About the user:\n${aboutUser}\n\nResponse style:\n${responseStyle}`,
    });
  }

  // 2. Project context (if conversation is in a project)
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

  // 4. Retrieved memories (RAG)
  try {
    const memories = await ctx.runQuery(internal.memories.search, {
      userId: args.userId,
      query: args.userMessage,
      limit: 8,
    });

    if (memories && memories.length > 0) {
      const memoryContent = memories.map((m: any) => `- ${m.content}`).join("\n");
      systemMessages.push({
        role: "system",
        content: `Memories:\n${memoryContent}`,
      });
    }
  } catch (error) {
    // Memory system might not be implemented yet, silently skip
    console.log("Memory retrieval skipped:", error);
  }

  return systemMessages;
}

export const generateResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    assistantMessageId: v.id("messages"),
    modelId: v.string(),
    userId: v.id("users"),
    thinkingEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
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

      // 4. Build system prompts (NEW)
      const systemPrompts = await buildSystemPrompts(ctx, {
        userId: args.userId,
        conversationId: args.conversationId,
        userMessage: lastUserMsg?.content || "",
      });

      // 5. Filter conversation history (exclude pending message)
      const history = messages
        .filter(
          (m: Doc<"messages">) => m._id !== args.assistantMessageId && m.status === "complete",
        )
        .map((m: Doc<"messages">) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content || "",
        }));

      // 6. Combine: system prompts FIRST, then history
      const allMessages = [...systemPrompts, ...history];

      // 7. Get model from registry
      const model = getModel(args.modelId);
      const modelConfig = getModelConfig(args.modelId);

      // 8. Build streamText options
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

      // Stream from LLM
      const result = streamText(options);

      // 6. Accumulate chunks, throttle DB updates
      let accumulated = "";
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

      // 11. Auto-name if conversation still has default title
      const conversation = await ctx.runQuery(internal.conversations.getInternal, {
        id: args.conversationId,
      });

      if (conversation && conversation.title === "New Chat") {
        // Still has default title, schedule title generation
        await ctx.scheduler.runAfter(0, internal.ai.generateTitle.generateTitle, {
          conversationId: args.conversationId,
        });
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
