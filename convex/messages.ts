import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

export * as embeddings from "./messages/embeddings";

export const create = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("error"),
      ),
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role,
      content: args.content || "",
      status: args.status || "complete",
      model: args.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding generation for complete messages with content
    if (args.status === "complete" && args.content && args.content.trim().length > 0) {
      await ctx.scheduler.runAfter(0, internal.messages.embeddings.generateEmbedding, {
        messageId,
        content: args.content,
      });
    }

    return messageId;
  },
});

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const listInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const updatePartialContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialContent: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      partialContent: args.partialContent,
      status: "generating",
      updatedAt: Date.now(),
    });
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      content: args.content,
      partialContent: undefined,
      status: "complete",
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cost: args.cost,
      generationCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding generation for completed assistant message
    if (args.content && args.content.trim().length > 0) {
      await ctx.scheduler.runAfter(0, internal.messages.embeddings.generateEmbedding, {
        messageId: args.messageId,
        content: args.content,
      });
    }
  },
});

export const markError = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "error",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});
