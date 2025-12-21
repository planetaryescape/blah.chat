import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { getCurrentUserOrCreate } from "../lib/userSync";

// ===== File Junction Operations =====

export const addFileToProject = mutation({
	args: {
		projectId: v.id("projects"),
		fileId: v.id("files"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);

		// Dual ownership check
		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}
		const file = await ctx.db.get(args.fileId);
		if (!file || file.userId !== user._id) {
			throw new Error("File not found");
		}

		// Duplicate prevention
		const existing = await ctx.db
			.query("projectFiles")
			.withIndex("by_project_file", (q) =>
				q.eq("projectId", args.projectId).eq("fileId", args.fileId),
			)
			.first();
		if (existing) return existing._id;

		// Insert junction
		const junctionId = await ctx.db.insert("projectFiles", {
			projectId: args.projectId,
			fileId: args.fileId,
			userId: user._id,
			addedAt: Date.now(),
		});

		// Activity event
		await ctx.db.insert("activityEvents", {
			userId: user._id,
			projectId: args.projectId,
			eventType: "file_linked",
			resourceType: "file",
			resourceId: args.fileId,
			metadata: { filename: file.name },
			createdAt: Date.now(),
		});

		// Trigger file embedding generation if not already processed
		if (!file.embeddingStatus || file.embeddingStatus === "pending") {
			// @ts-ignore - Type depth exceeded with internal reference
			await ctx.scheduler.runAfter(
				0,
				internal.files.embeddings.generateFileEmbeddings,
				{
					fileId: args.fileId,
				},
			);
		}

		return junctionId;
	},
});

export const removeFileFromProject = mutation({
	args: {
		projectId: v.id("projects"),
		fileId: v.id("files"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.projectId);

		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		// Delete junction row
		const junction = await ctx.db
			.query("projectFiles")
			.withIndex("by_project_file", (q) =>
				q.eq("projectId", args.projectId).eq("fileId", args.fileId),
			)
			.first();
		if (junction) {
			await ctx.db.delete(junction._id);

			// Activity event
			const file = await ctx.db.get(args.fileId);
			if (file) {
				await ctx.db.insert("activityEvents", {
					userId: user._id,
					projectId: args.projectId,
					eventType: "file_removed",
					resourceType: "file",
					resourceId: args.fileId,
					metadata: { filename: file.name },
					createdAt: Date.now(),
				});
			}
		}
	},
});

export const bulkAddFilesToProject = mutation({
	args: {
		projectId: v.id("projects"),
		fileIds: v.array(v.id("files")),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserOrCreate(ctx);
		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) {
			throw new Error("Project not found");
		}

		const results = {
			added: [] as any[],
			skipped: [] as any[],
			errors: [] as any[],
		};

		for (const fileId of args.fileIds) {
			try {
				const file = await ctx.db.get(fileId);
				if (!file || file.userId !== user._id) {
					results.errors.push({ fileId, error: "File not found" });
					continue;
				}

				const existing = await ctx.db
					.query("projectFiles")
					.withIndex("by_project_file", (q) =>
						q.eq("projectId", args.projectId).eq("fileId", fileId),
					)
					.first();

				if (existing) {
					results.skipped.push(fileId);
					continue;
				}

				const junctionId = await ctx.db.insert("projectFiles", {
					projectId: args.projectId,
					fileId,
					userId: user._id,
					addedAt: Date.now(),
				});

				await ctx.db.insert("activityEvents", {
					userId: user._id,
					projectId: args.projectId,
					eventType: "file_linked",
					resourceType: "file",
					resourceId: fileId,
					metadata: { filename: file.name },
					createdAt: Date.now(),
				});

				results.added.push(junctionId);
			} catch (error: any) {
				results.errors.push({ fileId, error: error.message });
			}
		}

		return results;
	},
});
