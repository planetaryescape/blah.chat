import { v } from "convex/values";
import { nanoid } from "nanoid";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ===== Re-exports from submodules =====

export * as password from "./shares/password";
export * as internal from "./shares/internal";
export * as fork from "./shares/fork";

// Backward compatibility re-exports
export {
	getByShareId,
	incrementViewCount,
	getUserInternal,
	getConversationInternal,
	getMessagesInternal,
	getAttachmentsByMessageInternal,
	getToolCallsByMessageInternal,
	getSourcesByMessageInternal,
	getAttachmentsByConversationInternal,
	getToolCallsByConversationInternal,
	getSourcesByConversationInternal,
	getUserByIdInternal,
} from "./shares/internal";
export {
	forkPrivate,
	forkCollaborative,
	createForkedConversation,
	copyMessage,
	copyAttachment,
	copyToolCall,
	copySource,
	addParticipant,
	createJoinNotification,
} from "./shares/fork";

// ===== Core CRUD =====

export const create = action({
	args: {
		conversationId: v.id("conversations"),
		password: v.optional(v.string()),
		expiresIn: v.optional(v.number()),
		anonymizeUsernames: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		// Get user from DB
		const user = (await (ctx.runQuery as any)(
			// @ts-ignore - TypeScript recursion limit
			internal.shares.internal.getUserInternal,
			{ clerkId: identity.subject },
		)) as Doc<"users"> | null;
		if (!user) throw new Error("User not found");

		// Verify conversation ownership
		const conversation = await ctx.runQuery(
			internal.shares.internal.getConversationInternal,
			{ conversationId: args.conversationId },
		);
		if (!conversation || conversation.userId !== user._id) {
			throw new Error("Conversation not found or unauthorized");
		}

		// Hash password if provided
		let hashedPassword: string | undefined;
		if (args.password) {
			hashedPassword = await ctx.runMutation(
				internal.shares.password.hashPassword,
				{ password: args.password },
			);
		}

		// Calculate expiry timestamp
		let expiresAt: number | undefined;
		if (args.expiresIn) {
			expiresAt = Date.now() + args.expiresIn * 24 * 60 * 60 * 1000;
		}

		const shareId = nanoid(10);

		await ctx.runMutation(internal.shares.createInternal, {
			conversationId: args.conversationId,
			userId: user._id,
			shareId,
			title: conversation.title,
			password: hashedPassword,
			expiresAt,
			anonymizeUsernames: args.anonymizeUsernames || false,
		});

		return shareId;
	},
});

export const createInternal = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		userId: v.id("users"),
		shareId: v.string(),
		title: v.string(),
		password: v.optional(v.string()),
		expiresAt: v.optional(v.number()),
		anonymizeUsernames: v.boolean(),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("shares", {
			conversationId: args.conversationId,
			userId: args.userId,
			shareId: args.shareId,
			title: args.title,
			password: args.password,
			expiresAt: args.expiresAt,
			anonymizeUsernames: args.anonymizeUsernames,
			isPublic: true,
			isActive: true,
			viewCount: 0,
			createdAt: Date.now(),
		});
	},
});

export const get = query({
	args: { shareId: v.string() },
	handler: async (ctx, args) => {
		const share = await ctx.db
			.query("shares")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		if (!share) return null;

		if (!share.isActive) {
			return { revoked: true };
		}

		if (share.expiresAt && share.expiresAt < Date.now()) {
			return null;
		}

		return {
			_id: share._id,
			conversationId: share.conversationId,
			userId: share.userId,
			requiresPassword: !!share.password,
			anonymizeUsernames: share.anonymizeUsernames,
			expiresAt: share.expiresAt,
			isActive: share.isActive,
		};
	},
});

export const getSharedConversation = query({
	args: { shareId: v.string() },
	handler: async (ctx, args) => {
		const share = await ctx.db
			.query("shares")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		if (!share || !share.isActive) return null;
		if (share.expiresAt && share.expiresAt < Date.now()) return null;

		const conversation = await ctx.db.get(share.conversationId);
		return conversation;
	},
});

export const getSharedMessages = query({
	args: { shareId: v.string() },
	handler: async (ctx, args) => {
		const share = await ctx.db
			.query("shares")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		if (!share || !share.isActive) return null;
		if (share.expiresAt && share.expiresAt < Date.now()) return null;

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", share.conversationId),
			)
			.collect();

		return messages;
	},
});

export const verify = action({
	args: {
		shareId: v.string(),
		password: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const share = await ctx.runQuery(internal.shares.internal.getByShareId, {
			shareId: args.shareId,
		});

		if (!share) throw new Error("Share not found");

		if (!share.isActive) {
			throw new Error("This share has been revoked by the owner");
		}

		if (share.expiresAt && share.expiresAt < Date.now()) {
			throw new Error("Share has expired");
		}

		if (share.password) {
			if (!args.password) {
				throw new Error("Password required");
			}
			const valid = await ctx.runMutation(
				internal.shares.password.verifyPassword,
				{
					password: args.password,
					hash: share.password,
				},
			);
			if (!valid) {
				throw new Error("Invalid password");
			}
		}

		await ctx.runMutation(internal.shares.internal.incrementViewCount, {
			shareId: share._id,
		});

		return true;
	},
});

export const toggle = mutation({
	args: {
		conversationId: v.id("conversations"),
		isActive: v.boolean(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);

		const share = await ctx.db
			.query("shares")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.first();

		if (!share) {
			throw new Error("No share exists for this conversation");
		}

		if (share.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		await ctx.db.patch(share._id, {
			isActive: args.isActive,
		});

		return share.shareId;
	},
});

export const getByConversation = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const share = await ctx.db
			.query("shares")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.first();

		if (!share || share.userId !== user._id) {
			return null;
		}

		return share;
	},
});

export const list = query({
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const shares = await ctx.db
			.query("shares")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.collect();

		return shares;
	},
});

export const remove = mutation({
	args: { shareId: v.id("shares") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const share = await ctx.db.get(args.shareId);

		if (!share || share.userId !== user._id) {
			throw new Error("Share not found or unauthorized");
		}

		await ctx.db.delete(args.shareId);
	},
});
