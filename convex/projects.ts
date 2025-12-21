import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ===== Re-exports from submodules =====

export * as notes from "./projects/notes";
export * as files from "./projects/files";
export * as resources from "./projects/resources";
export * as activity from "./projects/activity";
export * as internal from "./projects/internal";

// Backward compatibility re-exports
export {
	addNoteToProject,
	removeNoteFromProject,
	bulkAddNotesToProject,
} from "./projects/notes";
export {
	addFileToProject,
	removeFileFromProject,
	bulkAddFilesToProject,
} from "./projects/files";
export {
	getProjectResources,
	getProjectStats,
	getProjectConversationIds,
	getProjectAttachments,
} from "./projects/resources";
export { getProjectActivity, getUserActivity } from "./projects/activity";
export { getInternal, getConversationCount } from "./projects/internal";

// ===== Core CRUD =====

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		isTemplate: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);

		const projectId = await ctx.db.insert("projects", {
			userId: user._id,
			name: args.name,
			description: args.description,
			systemPrompt: args.systemPrompt,
			isTemplate: args.isTemplate,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});

		return projectId;
	},
});

export const list = query({
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const projects = await ctx.db
			.query("projects")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		return projects.sort((a, b) => b.updatedAt - a.updatedAt);
	},
});

export const get = query({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const project = await ctx.db.get(args.id);
		if (!project || project.userId !== user._id) return null;

		return project;
	},
});

export const update = mutation({
	args: {
		id: v.id("projects"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.id);

		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		const updates: any = { updatedAt: Date.now() };
		if (args.name !== undefined) updates.name = args.name;
		if (args.description !== undefined) updates.description = args.description;
		if (args.systemPrompt !== undefined)
			updates.systemPrompt = args.systemPrompt;

		await ctx.db.patch(args.id, updates);
	},
});

export const deleteProject = mutation({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.id);

		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		// Remove project from all conversations via junction table
		const junctions = await ctx.db
			.query("projectConversations")
			.withIndex("by_project", (q) => q.eq("projectId", args.id))
			.collect();

		for (const junction of junctions) {
			await ctx.db.delete(junction._id);

			const conv = await ctx.db.get(junction.conversationId);
			if (conv && conv.projectId === args.id) {
				await ctx.db.patch(junction.conversationId, {
					projectId: undefined,
					updatedAt: Date.now(),
				});
			}
		}

		await ctx.db.delete(args.id);
	},
});

// ===== Conversation Operations =====

export const addConversation = mutation({
	args: {
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.projectId);
		const conversation = await ctx.db.get(args.conversationId);

		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		if (!conversation || conversation.userId !== user._id) {
			throw new Error("Conversation not found");
		}

		// Check if junction exists
		const existing = await ctx.db
			.query("projectConversations")
			.withIndex("by_project_conversation", (q) =>
				q
					.eq("projectId", args.projectId)
					.eq("conversationId", args.conversationId),
			)
			.first();

		// Insert junction row if not exists
		if (!existing) {
			await ctx.db.insert("projectConversations", {
				projectId: args.projectId,
				conversationId: args.conversationId,
				addedAt: Date.now(),
				addedBy: user._id,
			});
		}

		// Update conversation.projectId
		await ctx.db.patch(args.conversationId, {
			projectId: args.projectId,
			updatedAt: Date.now(),
		});
	},
});

export const removeConversation = mutation({
	args: {
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.projectId);

		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		// Delete junction row
		const junction = await ctx.db
			.query("projectConversations")
			.withIndex("by_project_conversation", (q) =>
				q
					.eq("projectId", args.projectId)
					.eq("conversationId", args.conversationId),
			)
			.first();
		if (junction) {
			await ctx.db.delete(junction._id);
		}

		// Clear conversation.projectId
		const conversation = await ctx.db.get(args.conversationId);
		if (conversation && conversation.projectId === args.projectId) {
			await ctx.db.patch(args.conversationId, {
				projectId: undefined,
				updatedAt: Date.now(),
			});
		}
	},
});

export const assignConversations = mutation({
	args: {
		projectId: v.union(v.id("projects"), v.null()),
		conversationIds: v.array(v.id("conversations")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);

		// Verify project ownership if assigning to project
		if (args.projectId) {
			const project = await ctx.db.get(args.projectId);
			if (!project || project.userId !== user._id) {
				throw new Error("Project not found");
			}
		}

		// Update each conversation's projectId
		for (const convId of args.conversationIds) {
			const conversation = await ctx.db.get(convId);
			if (!conversation || conversation.userId !== user._id) {
				continue;
			}

			await ctx.db.patch(convId, {
				projectId: args.projectId || undefined,
				updatedAt: Date.now(),
			});
		}

		// Sync junction table
		if (args.projectId) {
			const projectId = args.projectId;

			// Remove all existing junctions for project
			const existingJunctions = await ctx.db
				.query("projectConversations")
				.withIndex("by_project", (q) => q.eq("projectId", projectId))
				.collect();
			for (const junction of existingJunctions) {
				await ctx.db.delete(junction._id);
			}

			// Create new junctions
			for (const convId of args.conversationIds) {
				await ctx.db.insert("projectConversations", {
					projectId,
					conversationId: convId,
					addedAt: Date.now(),
					addedBy: user._id,
				});
			}
		}
	},
});

// ===== Templates =====

export const listTemplates = query({
	handler: async (ctx) => {
		const user = await getCurrentUser(ctx);
		if (!user) return [];

		const templates = await ctx.db
			.query("projects")
			.withIndex("by_userId_isTemplate", (q) =>
				q.eq("userId", user._id).eq("isTemplate", true),
			)
			.collect();

		return templates.sort((a, b) => b.updatedAt - a.updatedAt);
	},
});

export const createFromTemplate = mutation({
	args: { templateId: v.id("projects") },
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const template = await ctx.db.get(args.templateId);

		if (!template || template.userId !== user._id) {
			throw new Error("Template not found");
		}

		const projectId = await ctx.db.insert("projects", {
			userId: user._id,
			name: `${template.name} (Copy)`,
			description: template.description,
			systemPrompt: template.systemPrompt,
			isTemplate: false,
			createdFrom: args.templateId,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});

		return projectId;
	},
});
