import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { getCurrentUserOrCreate } from "../lib/userSync";

export const createConsolidationConversation = mutation({
  args: {
    comparisonGroupId: v.string(),
    consolidationModel: v.string(),
  },
  returns: v.object({ conversationId: v.id("conversations") }),
  handler: async (
    ctx,
    args,
  ): Promise<{ conversationId: Id<"conversations"> }> => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Fetch comparison messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", args.comparisonGroupId),
      )
      .collect();

    // 2. Separate user message and assistant responses
    let userMessage = allMessages.find((m) => m.role === "user");
    const responses = allMessages.filter((m) => m.role === "assistant");

    // Fallback: For old messages without comparisonGroupId on user message,
    // find the user message by looking at the conversation of the first response
    if (!userMessage && responses.length > 0) {
      const conversationId = responses[0].conversationId;
      const allConversationMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId),
        )
        .order("asc")
        .collect();

      // Find the user message that came right before the comparison responses
      const firstResponseTime = Math.min(...responses.map((r) => r.createdAt));
      userMessage = allConversationMessages
        .filter((m) => m.role === "user" && m.createdAt < firstResponseTime)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    if (!userMessage || responses.length === 0) {
      throw new Error(
        `Invalid comparison group: found ${allMessages.length} messages (${responses.length} assistant, ${userMessage ? 1 : 0} user) for groupId ${args.comparisonGroupId}`,
      );
    }

    // 3. Build consolidation prompt
    const modelList = responses.map((r) => r.model || "unknown").join(", ");
    let consolidationPrompt = `Here are ${responses.length} responses from ${modelList} about:\n\n`;
    consolidationPrompt += `**Original prompt:** "${userMessage.content}"\n\n`;

    for (const r of responses) {
      consolidationPrompt += `**Response from ${r.model || "unknown"}:**\n${r.content}\n\n`;
    }

    consolidationPrompt +=
      "Can you consolidate all of this information into one comprehensive, well-organized response? Identify common themes, reconcile any differences, and synthesize the best insights from each response.";

    // 4. Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      model: args.consolidationModel,
      title: `Consolidation: ${userMessage.content.slice(0, 50)}...`,
      pinned: false,
      archived: false,
      starred: false,
      messageCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Insert user message with consolidated prompt
    await ctx.db.insert("messages", {
      conversationId,
      userId: user._id,
      role: "user",
      content: consolidationPrompt,
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Schedule generation (action creates assistant message)
    // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId,
      modelId: args.consolidationModel,
      userId: user._id,
    });

    return { conversationId };
  },
});

export const consolidateInSameChat = mutation({
  args: {
    conversationId: v.id("conversations"),
    comparisonGroupId: v.string(),
    consolidationModel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // 1. Fetch comparison group messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_comparison_group", (q) =>
        q.eq("comparisonGroupId", args.comparisonGroupId),
      )
      .collect();

    // 2. Separate user message and assistant responses
    const userMessage = allMessages.find((m) => m.role === "user");
    const responses = allMessages.filter((m) => m.role === "assistant");

    if (!userMessage || responses.length === 0) {
      throw new Error("Invalid comparison group");
    }

    // 3. Build consolidation prompt
    const modelList = responses.map((r) => r.model || "unknown").join(", ");
    let consolidationPrompt = `Here are ${responses.length} responses from ${modelList} about:\n\n`;
    consolidationPrompt += `**Original prompt:** "${userMessage.content}"\n\n`;

    for (const r of responses) {
      consolidationPrompt += `**Response from ${r.model || "unknown"}:**\n${r.content}\n\n`;
    }

    consolidationPrompt +=
      "Can you consolidate all of this information into one comprehensive, well-organized response? Identify common themes, reconcile any differences, and synthesize the best insights from each response.";

    // 4. Insert pending consolidated assistant message (NO comparisonGroupId)
    const consolidatedMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: "",
      status: "pending",
      model: args.consolidationModel,
      isConsolidation: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Link comparison messages to consolidated message
    for (const response of responses) {
      await ctx.db.patch(response._id, {
        consolidatedMessageId,
      });
    }

    // 6. Update conversation messageCount (+1 for consolidated message)
    const conversation = await ctx.db.get(args.conversationId);
    await ctx.db.patch(args.conversationId, {
      messageCount: (conversation?.messageCount || 0) + 1,
      lastMessageAt: Date.now(),
    });

    // 7. Schedule generation with consolidation prompt as system context (reuse existing message)
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: args.conversationId,
      existingMessageId: consolidatedMessageId,
      modelId: args.consolidationModel,
      userId: user._id,
      systemPromptOverride: consolidationPrompt,
    });

    return { messageId: consolidatedMessageId };
  },
});
