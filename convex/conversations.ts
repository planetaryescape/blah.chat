// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cascadeDeleteConversation } from "./lib/utils/cascade";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ===== Re-exports from submodules =====
export * as tokens from "./conversations/tokens";
export * as bulk from "./conversations/bulk";
export * as branching from "./conversations/branching";
export * as consolidation from "./conversations/consolidation";
export * as internal from "./conversations/internal";
export * as actions from "./conversations/actions";
export * as hybridSearch from "./conversations/hybridSearch";

// Re-export canAccessConversation helper for use in other modules
export { canAccessConversation } from "./conversations/branching";

// ===== Core CRUD =====

export const create = mutation({
	args: {
		model: v.string(),
		title: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		isIncognito: v.optional(v.boolean()),
		incognitoSettings: v.optional(
			v.object({
				enableReadTools: v.optional(v.boolean()),
				applyCustomInstructions: v.optional(v.boolean()),
				inactivityTimeoutMinutes: v.optional(v.number()),
			}),
		),
		isPresentation: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);

		const now = Date.now();
		const conversationId = await ctx.db.insert("conversations", {
			userId: user._id,
			title: args.title || (args.isIncognito ? "Incognito Chat" : "New Chat"),
			model: args.model,
			systemPrompt: args.systemPrompt,
			pinned: false,
			archived: false,
			starred: false,
			messageCount: 0,
			lastMessageAt: now,
			createdAt: now,
			updatedAt: now,
			...(args.isIncognito && {
				isIncognito: true,
				incognitoSettings: {
					enableReadTools: args.incognitoSettings?.enableReadTools ?? true,
					applyCustomInstructions:
						args.incognitoSettings?.applyCustomInstructions ?? true,
					inactivityTimeoutMinutes:
						args.incognitoSettings?.inactivityTimeoutMinutes,
					lastActivityAt: now,
				},
			}),
			...(args.isPresentation && { isPresentation: true }),
		});

		// Update user stats for progressive hints
		const stats = await ctx.db
			.query("userStats")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.first();

		if (stats) {
			await ctx.db.patch(stats._id, {
				totalConversations: stats.totalConversations + 1,
				messagesInCurrentConvo: 0,
				lastUpdated: Date.now(),
			});
		} else {
			await ctx.db.insert("userStats", {
				userId: user._id,
				totalMessages: 0,
				totalConversations: 1,
				totalSearches: 0,
				totalBookmarks: 0,
				longMessageCount: 0,
				messagesInCurrentConvo: 0,
				consecutiveSearches: 0,
				promptPatternCount: {},
				lastUpdated: Date.now(),
			});
		}

		return conversationId;
	},
});

export const get = query({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) return null;

		// Import canAccessConversation dynamically to avoid circular deps
		const { canAccessConversation } = await import("./conversations/branching");
		const hasAccess = await canAccessConversation(
			ctx,
			args.conversationId,
			user._id,
		);

		if (!hasAccess) return null;

		return conversation;
	},
});

export const getWithClerkVerification = query({
	args: {
		conversationId: v.id("conversations"),
		clerkId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.first();

		if (!user) return null;

		const conversation = await ctx.db.get(args.conversationId);

		if (!conversation || conversation.userId !== user._id) {
			return null;
		}

		return conversation;
	},
});

export const list = query({
	args: {
		searchQuery: v.optional(v.string()),
		limit: v.optional(v.number()),
		projectId: v.optional(v.union(v.id("projects"), v.literal("none"))),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		// SEARCH MODE: Use search index if query provided
		if (args.searchQuery?.trim()) {
			const query = ctx.db
				.query("conversations")
				.withSearchIndex("search_title", (q) =>
					q
						// biome-ignore lint/style/noNonNullAssertion: searchQuery is validated as required
						.search("title", args.searchQuery!)
						.eq("userId", user._id)
						.eq("archived", false),
				);

			let results = args.limit
				? await query.take(args.limit)
				: await query.collect();

			if (args.projectId !== undefined) {
				if (args.projectId === "none") {
					results = results.filter((c) => !c.projectId);
				} else {
					results = results.filter((c) => c.projectId === args.projectId);
				}
			}

			return results.sort((a, b) => {
				if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
				return 0;
			});
		}

		// DEFAULT MODE: Get owned + collaborative conversations
		let ownedQuery = ctx.db
			.query("conversations")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.filter((q) => q.eq(q.field("archived"), false));

		if (args.projectId !== undefined) {
			if (args.projectId === "none") {
				ownedQuery = ownedQuery.filter((q) =>
					q.eq(q.field("projectId"), undefined),
				);
			} else {
				ownedQuery = ownedQuery.filter((q) =>
					q.eq(q.field("projectId"), args.projectId),
				);
			}
		}

		const owned = await ownedQuery.collect();

		// Get collaborative conversations where user is participant
		const participations = await ctx.db
			.query("conversationParticipants")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		const collabConversations = await Promise.all(
			participations.map((p) => ctx.db.get(p.conversationId)),
		);

		let filteredCollab = collabConversations.filter(
			(c): c is NonNullable<typeof c> => c !== null && !c.archived,
		);

		if (args.projectId !== undefined) {
			if (args.projectId === "none") {
				filteredCollab = filteredCollab.filter((c) => !c.projectId);
			} else {
				filteredCollab = filteredCollab.filter(
					(c) => c.projectId === args.projectId,
				);
			}
		}

		// Merge and dedupe
		const allConversations = [...owned];
		for (const collab of filteredCollab) {
			if (!allConversations.find((c) => c._id === collab._id)) {
				allConversations.push(collab);
			}
		}

		// Sort: pinned first, then by lastMessageAt
		const sorted = allConversations.sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return b.lastMessageAt - a.lastMessageAt;
		});

		return args.limit ? sorted.slice(0, args.limit) : sorted;
	},
});

// ===== Single Item Operations =====

export const togglePin = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		if (!conv.pinned && conv.messageCount === 0) {
			throw new Error("Cannot pin empty conversation");
		}

		await ctx.db.patch(args.conversationId, {
			pinned: !conv.pinned,
			updatedAt: Date.now(),
		});
	},
});

export const toggleStar = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		await ctx.db.patch(args.conversationId, {
			starred: !conv.starred,
			updatedAt: Date.now(),
		});
	},
});

export const archive = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		await ctx.db.patch(args.conversationId, {
			archived: true,
			updatedAt: Date.now(),
		});
	},
});

export const deleteConversation = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		await cascadeDeleteConversation(ctx, args.conversationId);
	},
});

export const rename = mutation({
	args: {
		conversationId: v.id("conversations"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		await ctx.db.patch(args.conversationId, {
			title: args.title,
			updatedAt: Date.now(),
		});
	},
});

export const updateModel = mutation({
	args: {
		conversationId: v.id("conversations"),
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const conv = await ctx.db.get(args.conversationId);
		if (!conv || conv.userId !== user._id) throw new Error("Not found");

		await ctx.db.patch(args.conversationId, {
			model: args.model,
			updatedAt: Date.now(),
		});
	},
});

export const cleanupEmptyConversations = mutation({
	args: {
		keepOne: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const keepOne = args.keepOne ?? true;

		const conversations = await ctx.db
			.query("conversations")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.filter((q) => q.eq(q.field("archived"), false))
			.collect();

		const sorted = conversations.sort(
			(a, b) => b.lastMessageAt - a.lastMessageAt,
		);

		const emptyConversations = [];
		for (const conv of sorted) {
			const messages = await ctx.db
				.query("messages")
				.withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
				.collect();

			const actualMessageCount = messages.length;

			if (conv.messageCount !== actualMessageCount) {
				console.warn(
					`messageCount mismatch for conversation ${conv._id}: ` +
						`cached=${conv.messageCount}, actual=${actualMessageCount}`,
				);
				await ctx.db.patch(conv._id, { messageCount: actualMessageCount });
			}

			if (actualMessageCount === 0) {
				emptyConversations.push(conv);
			}
		}

		const toDelete = keepOne
			? emptyConversations.slice(1)
			: emptyConversations;

		let deletedCount = 0;
		for (const conv of toDelete) {
			await cascadeDeleteConversation(ctx, conv._id);
			deletedCount++;
		}

		if (!keepOne && deletedCount > 0) {
			const remainingConversations = await ctx.db
				.query("conversations")
				.withIndex("by_user", (q) => q.eq("userId", user._id))
				.filter((q) => q.eq(q.field("archived"), false))
				.collect();

			if (remainingConversations.length === 0) {
				await ctx.db.insert("conversations", {
					userId: user._id,
					model: "openai:gpt-5-mini",
					title: "New Chat",
					messageCount: 0,
					pinned: false,
					archived: false,
					starred: false,
					lastMessageAt: Date.now(),
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			}
		}

		return { deletedCount };
	},
});

export const dismissModelRecommendation = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) throw new Error("Not authenticated");

		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) throw new Error("Conversation not found");

		if (conversation.userId !== user._id) {
			throw new Error("Not authorized");
		}

		if (!conversation.modelRecommendation) return;

		await ctx.db.patch(args.conversationId, {
			modelRecommendation: {
				...conversation.modelRecommendation,
				dismissed: true,
			},
		});
	},
});

// ===== Backward Compatibility Re-exports =====

// From tokens.ts
export {
	getTokenUsage,
	getConversationTokensByModel,
	getTotalConversationTokens,
	updateTokenUsage,
	updateConversationTokenUsage,
} from "./conversations/tokens";

// From bulk.ts
export {
	bulkDelete,
	bulkArchive,
	bulkPin,
	bulkUnpin,
	bulkStar,
	bulkUnstar,
} from "./conversations/bulk";

// From branching.ts
export {
	getParticipants,
	getChildBranches,
	getChildBranchesFromMessage,
} from "./conversations/branching";

// From consolidation.ts
export {
	createConsolidationConversation,
	consolidateInSameChat,
} from "./conversations/consolidation";

// From internal.ts
export {
	getInternal,
	createInternal,
	updateLastMessageAt,
	updateTitle,
	updateMemoryTracking,
	updateMemoryCache,
	clearMemoryCache,
	updateExtractionCursor,
	backfillMessageCounts,
	setModelRecommendation,
	setModeInternal,
} from "./conversations/internal";
