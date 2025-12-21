import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// ===== Resource Queries =====

export const getProjectResources = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) return null;

		// Fetch all junctions in parallel
		const [conversationJunctions, noteJunctions, fileJunctions, tasks] =
			await Promise.all([
				ctx.db
					.query("projectConversations")
					.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
					.collect(),
				ctx.db
					.query("projectNotes")
					.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
					.collect(),
				ctx.db
					.query("projectFiles")
					.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
					.collect(),
				ctx.db
					.query("tasks")
					.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
					.collect(),
			]);

		// Batch hydrate (N+1 prevention)
		const [conversations, notes, files] = await Promise.all([
			Promise.all(
				conversationJunctions.map((j) => ctx.db.get(j.conversationId)),
			),
			Promise.all(noteJunctions.map((j) => ctx.db.get(j.noteId))),
			Promise.all(fileJunctions.map((j) => ctx.db.get(j.fileId))),
		]);

		// Filter deleted resources
		return {
			project,
			conversations: conversations.filter(
				(c): c is NonNullable<typeof c> => c !== null,
			),
			notes: notes.filter((n): n is NonNullable<typeof n> => n !== null),
			files: files.filter((f): f is NonNullable<typeof f> => f !== null),
			tasks,
		};
	},
});

export const getProjectStats = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		// Verify project ownership
		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) {
			return null;
		}

		// Fetch all resource counts and activity in parallel
		const [
			projectConversations,
			noteJunctions,
			fileJunctions,
			allTasks,
			lastActivity,
		] = await Promise.all([
			ctx.db
				.query("conversations")
				.withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
				.collect(),
			ctx.db
				.query("notes")
				.withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
				.collect(),
			ctx.db
				.query("projectFiles")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
				.collect(),
			ctx.db
				.query("tasks")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
				.collect(),
			ctx.db
				.query("activityEvents")
				.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
				.order("desc")
				.first(),
		]);

		// Task breakdown
		const taskStats = {
			total: allTasks.length,
			active: allTasks.filter(
				(t) => t.status !== "completed" && t.status !== "cancelled",
			).length,
			completed: allTasks.filter((t) => t.status === "completed").length,
		};

		return {
			conversationCount: projectConversations.length,
			noteCount: noteJunctions.length,
			fileCount: fileJunctions.length,
			activeTaskCount: taskStats.active,
			taskStats,
			lastActivityAt:
				lastActivity?.createdAt || project._creationTime || Date.now(),
		};
	},
});

export const getProjectConversationIds = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) {
			throw new Error("Unauthorized");
		}

		const junctions = await ctx.db
			.query("projectConversations")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();

		return junctions.map((j) => j.conversationId);
	},
});

export const getProjectAttachments = query({
	args: {
		projectId: v.id("projects"),
		paginationOpts: v.optional(
			v.object({
				numItems: v.number(),
				cursor: v.union(v.string(), v.null()),
			}),
		),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return { page: [], isDone: true, continueCursor: "" };

		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) {
			return { page: [], isDone: true, continueCursor: "" };
		}

		// Get all conversation IDs for this project
		const conversationJunctions = await ctx.db
			.query("projectConversations")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();

		const conversationIds = conversationJunctions.map((j) => j.conversationId);

		if (conversationIds.length === 0) {
			return { page: [], isDone: true, continueCursor: "" };
		}

		// Fetch attachments for these conversations
		const allAttachments = await Promise.all(
			conversationIds.map((id) =>
				ctx.db
					.query("attachments")
					.withIndex("by_conversation", (q) => q.eq("conversationId", id))
					.collect(),
			),
		);

		const flatAttachments = allAttachments
			.flat()
			.sort((a, b) => b.createdAt - a.createdAt);

		// Simple manual pagination
		const { numItems = 50, cursor } = args.paginationOpts || {};
		const startIndex = cursor ? Number(cursor) : 0;
		const page = flatAttachments.slice(startIndex, startIndex + numItems);
		const hasMore = startIndex + numItems < flatAttachments.length;

		return {
			page,
			isDone: !hasMore,
			continueCursor: hasMore ? String(startIndex + numItems) : null,
		};
	},
});
