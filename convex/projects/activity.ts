import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// ===== Activity Feed Queries =====

export const getProjectActivity = query({
	args: {
		projectId: v.id("projects"),
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const project = await ctx.db.get(args.projectId);
		if (!project || project.userId !== user._id) return null;

		const limit = args.limit ?? 50;
		const offset = args.offset ?? 0;

		// Fetch events (ordered newest first)
		const events = await ctx.db
			.query("activityEvents")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.order("desc")
			.collect();

		const paginatedEvents = events.slice(offset, offset + limit);

		// N+1 PREVENTION: Deduplicate resource IDs by type
		const resourceIdsByType: Record<string, Set<any>> = {
			task: new Set(),
			note: new Set(),
			file: new Set(),
			conversation: new Set(),
		};

		for (const event of paginatedEvents) {
			if (event.resourceType && event.resourceId) {
				resourceIdsByType[event.resourceType]?.add(event.resourceId);
			}
		}

		// Batch fetch all resources in parallel
		const [tasks, notes, files, conversations] = await Promise.all([
			Promise.all([...resourceIdsByType.task].map((id) => ctx.db.get(id))),
			Promise.all([...resourceIdsByType.note].map((id) => ctx.db.get(id))),
			Promise.all([...resourceIdsByType.file].map((id) => ctx.db.get(id))),
			Promise.all(
				[...resourceIdsByType.conversation].map((id) => ctx.db.get(id)),
			),
		]);

		// Create lookup maps (filter nulls)
		const resourceMaps: Record<string, Map<any, any>> = {
			task: new Map(
				tasks
					.filter((t): t is NonNullable<typeof t> => t !== null)
					.map((t) => [t._id, t]),
			),
			note: new Map(
				notes
					.filter((n): n is NonNullable<typeof n> => n !== null)
					.map((n) => [n._id, n]),
			),
			file: new Map(
				files
					.filter((f): f is NonNullable<typeof f> => f !== null)
					.map((f) => [f._id, f]),
			),
			conversation: new Map(
				conversations
					.filter((c): c is NonNullable<typeof c> => c !== null)
					.map((c) => [c._id, c]),
			),
		};

		// Hydrate events with resources
		const hydratedEvents = paginatedEvents.map((event) => ({
			...event,
			resource: event.resourceType
				? resourceMaps[event.resourceType]?.get(event.resourceId) || null
				: null,
		}));

		return {
			events: hydratedEvents,
			total: events.length,
			hasMore: offset + limit < events.length,
		};
	},
});

export const getUserActivity = query({
	args: {
		limit: v.optional(v.number()),
		offset: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUser(ctx);
		if (!user) return null;

		const limit = args.limit ?? 50;
		const offset = args.offset ?? 0;

		// Fetch events (ordered newest first)
		const events = await ctx.db
			.query("activityEvents")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.collect();

		const paginatedEvents = events.slice(offset, offset + limit);

		// N+1 PREVENTION: Deduplicate resource and project IDs
		const resourceIdsByType: Record<string, Set<any>> = {
			task: new Set(),
			note: new Set(),
			file: new Set(),
			conversation: new Set(),
		};
		const projectIds = new Set<any>();

		for (const event of paginatedEvents) {
			if (event.resourceType && event.resourceId) {
				resourceIdsByType[event.resourceType]?.add(event.resourceId);
			}
			if (event.projectId) {
				projectIds.add(event.projectId);
			}
		}

		// Batch fetch all resources and projects in parallel
		const [tasks, notes, files, conversations, projects] = await Promise.all([
			Promise.all([...resourceIdsByType.task].map((id) => ctx.db.get(id))),
			Promise.all([...resourceIdsByType.note].map((id) => ctx.db.get(id))),
			Promise.all([...resourceIdsByType.file].map((id) => ctx.db.get(id))),
			Promise.all(
				[...resourceIdsByType.conversation].map((id) => ctx.db.get(id)),
			),
			Promise.all([...projectIds].map((id) => ctx.db.get(id))),
		]);

		// Create lookup maps (filter nulls)
		const resourceMaps: Record<string, Map<any, any>> = {
			task: new Map(
				tasks
					.filter((t): t is NonNullable<typeof t> => t !== null)
					.map((t) => [t._id, t]),
			),
			note: new Map(
				notes
					.filter((n): n is NonNullable<typeof n> => n !== null)
					.map((n) => [n._id, n]),
			),
			file: new Map(
				files
					.filter((f): f is NonNullable<typeof f> => f !== null)
					.map((f) => [f._id, f]),
			),
			conversation: new Map(
				conversations
					.filter((c): c is NonNullable<typeof c> => c !== null)
					.map((c) => [c._id, c]),
			),
		};

		const projectMap = new Map(
			projects
				.filter((p): p is NonNullable<typeof p> => p !== null)
				.map((p) => [p._id, p]),
		);

		// Hydrate events with resources and projects
		const hydratedEvents = paginatedEvents.map((event) => ({
			...event,
			resource: event.resourceType
				? resourceMaps[event.resourceType]?.get(event.resourceId) || null
				: null,
			project: event.projectId ? projectMap.get(event.projectId) || null : null,
		}));

		return {
			events: hydratedEvents,
			total: events.length,
			hasMore: offset + limit < events.length,
		};
	},
});
