import { getModelConfig } from "@blah-chat/ai/utils";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { enforceModelPolicy, validatePromptContent } from "./chat";
import { canAccessConversation } from "./conversations/branching";
import { getCurrentUserOrCreate } from "./lib/userSync";

// A browser must never call the internal provider action directly.
export const generate = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    prompt: v.string(),
    model: v.string(),
    thinkingEffort: v.optional(
      v.union(
        v.literal("none"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    const message = await ctx.db.get(args.messageId);
    if (
      !conversation ||
      !(await canAccessConversation(ctx, conversation._id, user._id)) ||
      !message ||
      message.conversationId !== conversation._id ||
      message.role !== "assistant"
    ) {
      throw new Error("Message not found");
    }
    if (message.status === "generating" || message.status === "pending")
      throw new Error("Generation already in progress");
    validatePromptContent(args.prompt);
    if (!getModelConfig(args.model)?.capabilities.includes("image-generation"))
      throw new Error("Invalid image model");
    await enforceModelPolicy(ctx, user, [args.model]);
    const now = Date.now();
    await ctx.db.patch(message._id, {
      status: "pending",
      model: args.model,
      generationStartedAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.generation.image.generateImage, {
      ...args,
      userId: user._id,
    });
    return message._id;
  },
});
