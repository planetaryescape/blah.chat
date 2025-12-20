import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random 6-digit session code
function generateSessionCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new presentation session
export const create = mutation({
	args: {
		presentationId: v.id("presentations"),
		totalSlides: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.first();
		if (!user) throw new Error("User not found");

		// Deactivate any existing active sessions for this presentation
		const existingSessions = await ctx.db
			.query("presentationSessions")
			.withIndex("by_presentation", (q) =>
				q.eq("presentationId", args.presentationId).eq("isActive", true),
			)
			.collect();

		for (const session of existingSessions) {
			await ctx.db.patch(session._id, {
				isActive: false,
				updatedAt: Date.now(),
			});
		}

		// Generate unique session code
		let sessionCode = generateSessionCode();
		let attempts = 0;
		while (attempts < 10) {
			const existing = await ctx.db
				.query("presentationSessions")
				.withIndex("by_session_code", (q) =>
					q.eq("sessionCode", sessionCode).eq("isActive", true),
				)
				.first();
			if (!existing) break;
			sessionCode = generateSessionCode();
			attempts++;
		}

		const now = Date.now();
		const sessionId = await ctx.db.insert("presentationSessions", {
			presentationId: args.presentationId,
			userId: user._id,
			sessionCode,
			sessionCodeExpiresAt: now + 10 * 60 * 1000, // 10 minutes
			isActive: true,
			currentSlide: 0,
			totalSlides: args.totalSlides,
			createdAt: now,
			updatedAt: now,
		});

		return { sessionId, sessionCode };
	},
});

// Join a session by code (for remote control)
export const joinByCode = query({
	args: {
		sessionCode: v.string(),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query("presentationSessions")
			.withIndex("by_session_code", (q) =>
				q.eq("sessionCode", args.sessionCode).eq("isActive", true),
			)
			.first();

		if (!session) return null;

		// Check if code is expired
		if (Date.now() > session.sessionCodeExpiresAt) {
			return null;
		}

		// Get presentation details
		const presentation = await ctx.db.get(session.presentationId);
		if (!presentation) return null;

		return {
			sessionId: session._id,
			presentationId: session.presentationId,
			presentationTitle: presentation.title,
			currentSlide: session.currentSlide,
			totalSlides: session.totalSlides,
			timerStartedAt: session.timerStartedAt,
			timerElapsed: session.timerElapsed,
		};
	},
});

// Get active session for presentation
export const getActiveSession = query({
	args: {
		presentationId: v.id("presentations"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query("presentationSessions")
			.withIndex("by_presentation", (q) =>
				q.eq("presentationId", args.presentationId).eq("isActive", true),
			)
			.first();

		return session;
	},
});

// Get session by ID (for real-time subscription)
export const get = query({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sessionId);
	},
});

// Update current slide (from presenter or remote)
export const updateSlide = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
		slideIndex: v.number(),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		await ctx.db.patch(args.sessionId, {
			currentSlide: args.slideIndex,
			updatedAt: Date.now(),
		});
	},
});

// Navigate slide (increment/decrement)
export const navigateSlide = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
		direction: v.union(v.literal("next"), v.literal("prev")),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		let newIndex = session.currentSlide;
		if (args.direction === "next" && newIndex < session.totalSlides - 1) {
			newIndex++;
		} else if (args.direction === "prev" && newIndex > 0) {
			newIndex--;
		}

		await ctx.db.patch(args.sessionId, {
			currentSlide: newIndex,
			updatedAt: Date.now(),
		});

		return newIndex;
	},
});

// Start timer
export const startTimer = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		await ctx.db.patch(args.sessionId, {
			timerStartedAt: Date.now(),
			timerPausedAt: undefined,
			updatedAt: Date.now(),
		});
	},
});

// Pause timer
export const pauseTimer = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		const elapsed = session.timerStartedAt
			? Date.now() - session.timerStartedAt + (session.timerElapsed || 0)
			: session.timerElapsed || 0;

		await ctx.db.patch(args.sessionId, {
			timerPausedAt: Date.now(),
			timerElapsed: elapsed,
			timerStartedAt: undefined,
			updatedAt: Date.now(),
		});
	},
});

// Reset timer
export const resetTimer = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		await ctx.db.patch(args.sessionId, {
			timerStartedAt: undefined,
			timerPausedAt: undefined,
			timerElapsed: undefined,
			updatedAt: Date.now(),
		});
	},
});

// End session
export const end = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session) return;

		await ctx.db.patch(args.sessionId, {
			isActive: false,
			updatedAt: Date.now(),
		});
	},
});

// Ping from device (for connection status)
export const ping = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
		role: v.union(v.literal("presenter"), v.literal("remote")),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) return;

		const update =
			args.role === "presenter"
				? { lastPresenterPingAt: Date.now() }
				: { lastRemotePingAt: Date.now() };

		await ctx.db.patch(args.sessionId, {
			...update,
			updatedAt: Date.now(),
		});
	},
});

// Refresh session code (generate new code)
export const refreshCode = mutation({
	args: {
		sessionId: v.id("presentationSessions"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthorized");

		const session = await ctx.db.get(args.sessionId);
		if (!session || !session.isActive) {
			throw new Error("Session not found or inactive");
		}

		// Generate new unique code
		let sessionCode = generateSessionCode();
		let attempts = 0;
		while (attempts < 10) {
			const existing = await ctx.db
				.query("presentationSessions")
				.withIndex("by_session_code", (q) =>
					q.eq("sessionCode", sessionCode).eq("isActive", true),
				)
				.first();
			if (!existing || existing._id === args.sessionId) break;
			sessionCode = generateSessionCode();
			attempts++;
		}

		await ctx.db.patch(args.sessionId, {
			sessionCode,
			sessionCodeExpiresAt: Date.now() + 10 * 60 * 1000,
			updatedAt: Date.now(),
		});

		return sessionCode;
	},
});
