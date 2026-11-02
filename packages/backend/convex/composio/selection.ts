import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server";
import { canAccessConversation } from "../conversations/branching";
import { getCurrentUser } from "../lib/userSync";

async function selectedConnections(
  ctx: QueryCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
) {
  if (!(await canAccessConversation(ctx, conversationId, userId))) return [];
  const conversation = await ctx.db.get(conversationId);
  if (conversation?.isIncognito) return [];
  const selections = await ctx.db
    .query("conversationIntegrations")
    .withIndex("by_user_conversation", (q) =>
      q.eq("userId", userId).eq("conversationId", conversationId),
    )
    .collect();
  const connections = await Promise.all(
    selections.map((selection) => ctx.db.get(selection.connectionId)),
  );
  return connections.filter(
    (connection): connection is Doc<"composioConnections"> =>
      connection !== null &&
      connection.userId === userId &&
      connection.status === "active",
  );
}

export const getSelectedConnectionsInternal = internalQuery({
  args: { userId: v.id("users"), conversationId: v.id("conversations") },
  handler: (ctx, args) =>
    selectedConnections(ctx, args.userId, args.conversationId),
});

export const getSelectedIds = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return (await selectedConnections(ctx, user._id, args.conversationId)).map(
      (connection) => connection._id,
    );
  },
});

export const toggle = mutation({
  args: {
    conversationId: v.id("conversations"),
    connectionId: v.id("composioConnections"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (
      !user ||
      !(await canAccessConversation(ctx, args.conversationId, user._id))
    ) {
      throw new Error("Conversation not found or unauthorized");
    }
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation?.isIncognito)
      throw new Error("Integrations are disabled in incognito chats");
    const connection = await ctx.db.get(args.connectionId);
    if (
      !connection ||
      connection.userId !== user._id ||
      connection.status !== "active"
    ) {
      throw new Error("Connection not found or unauthorized");
    }
    const lock = await ctx.db
      .query("generationLocks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();
    if (lock)
      throw new Error(
        "Wait for the current response before changing integrations",
      );
    const selections = await ctx.db
      .query("conversationIntegrations")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", args.conversationId),
      )
      .collect();
    const existing = selections.find(
      (selection) => selection.connectionId === args.connectionId,
    );
    if (existing) await ctx.db.delete(existing._id);
    else
      await ctx.db.insert("conversationIntegrations", {
        ...args,
        userId: user._id,
      });
  },
});
