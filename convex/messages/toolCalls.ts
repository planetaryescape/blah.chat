import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// ===== Internal Mutations =====

export const addToolCalls = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCalls: v.array(
			v.object({
				id: v.string(),
				name: v.string(),
				arguments: v.string(),
				result: v.optional(v.string()),
				timestamp: v.number(),
				textPosition: v.optional(v.number()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");

		for (const tc of args.toolCalls) {
			await ctx.db.insert("toolCalls", {
				messageId: args.messageId,
				conversationId: message.conversationId,
				userId: message.userId!,
				toolCallId: tc.id,
				toolName: tc.name,
				args: JSON.parse(tc.arguments),
				result: tc.result ? JSON.parse(tc.result) : undefined,
				textPosition: tc.textPosition,
				isPartial: false,
				timestamp: tc.timestamp,
				createdAt: Date.now(),
			});
		}
	},
});

export const upsertToolCall = internalMutation({
	args: {
		messageId: v.id("messages"),
		conversationId: v.id("conversations"),
		userId: v.id("users"),
		toolCallId: v.string(),
		toolName: v.string(),
		args: v.any(),
		result: v.optional(v.any()),
		textPosition: v.optional(v.number()),
		isPartial: v.boolean(),
		timestamp: v.number(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("toolCalls")
			.withIndex("by_message", (q) => q.eq("messageId", args.messageId))
			.filter((q) => q.eq(q.field("toolCallId"), args.toolCallId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				args: args.args,
				result: args.result,
				isPartial: args.isPartial,
				timestamp: args.timestamp,
			});
		} else {
			await ctx.db.insert("toolCalls", {
				messageId: args.messageId,
				conversationId: args.conversationId,
				userId: args.userId,
				toolCallId: args.toolCallId,
				toolName: args.toolName,
				args: args.args,
				result: args.result,
				textPosition: args.textPosition,
				isPartial: args.isPartial,
				timestamp: args.timestamp,
				createdAt: Date.now(),
			});
		}
	},
});

export const finalizeToolCalls = internalMutation({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const partials = await ctx.db
			.query("toolCalls")
			.withIndex("by_message_partial", (q) =>
				q.eq("messageId", args.messageId).eq("isPartial", true),
			)
			.collect();

		for (const tc of partials) {
			await ctx.db.patch(tc._id, { isPartial: false });
		}
	},
});

export const updatePartialToolCalls = internalMutation({
	args: {
		messageId: v.id("messages"),
		partialToolCalls: v.array(
			v.object({
				id: v.string(),
				name: v.string(),
				arguments: v.string(),
				result: v.optional(v.string()),
				timestamp: v.number(),
				textPosition: v.optional(v.number()),
			}),
		),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			updatedAt: Date.now(),
		});
	},
});

// ===== Query Helpers =====

async function getMessageToolCalls(
	ctx: any,
	messageId: Id<"messages">,
	includePartial = false,
): Promise<any[]> {
	const toolCalls = await ctx.db
		.query("toolCalls")
		.withIndex("by_message", (q: any) => q.eq("messageId", messageId))
		.collect();

	const filtered = includePartial
		? toolCalls
		: toolCalls.filter((tc: any) => !tc.isPartial);

	return filtered.map((tc: any) => ({
		id: tc.toolCallId,
		name: tc.toolName,
		arguments: JSON.stringify(tc.args),
		result: tc.result ? JSON.stringify(tc.result) : undefined,
		timestamp: tc.timestamp,
		textPosition: tc.textPosition,
		isPartial: tc.isPartial,
	}));
}

// ===== Public Queries =====

export const getToolCalls = query({
	args: {
		messageId: v.id("messages"),
		includePartial: v.optional(v.boolean()),
	},
	handler: async (ctx, { messageId, includePartial }) => {
		return getMessageToolCalls(ctx, messageId, includePartial);
	},
});
