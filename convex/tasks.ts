import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// Smart Manager Phase 2: Task CRUD Operations

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    deadline: v.optional(v.number()),
    deadlineSource: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    sourceType: v.optional(
      v.union(
        v.literal("transcript"),
        v.literal("conversation"),
        v.literal("manual"),
        v.literal("file"),
      ),
    ),
    sourceId: v.optional(v.string()),
    sourceContext: v.optional(
      v.object({
        snippet: v.optional(v.string()),
        timestampSeconds: v.optional(v.number()),
        confidence: v.optional(v.number()),
      }),
    ),
    projectId: v.optional(v.id("projects")),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Validate project ownership if projectId provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      userId: user._id,
      title: args.title,
      description: args.description,
      status: args.status || "confirmed",
      deadline: args.deadline,
      deadlineSource: args.deadlineSource,
      urgency: args.urgency,
      sourceType: args.sourceType || "manual",
      sourceId: args.sourceId,
      sourceContext: args.sourceContext,
      projectId: args.projectId,
      priority: args.priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create activity event if part of a project
    if (args.projectId) {
      await ctx.db.insert("activityEvents", {
        userId: user._id,
        projectId: args.projectId,
        eventType: "task_created",
        resourceType: "task",
        resourceId: taskId,
        metadata: { title: args.title },
        createdAt: Date.now(),
      });
    }

    return taskId;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    deadline: v.optional(v.number()),
    deadlineSource: v.optional(v.string()),
    urgency: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    projectId: v.optional(v.id("projects")),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    // Validate new project ownership if changing project
    if (args.projectId !== undefined && args.projectId !== null) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.deadline !== undefined) updates.deadline = args.deadline;
    if (args.deadlineSource !== undefined)
      updates.deadlineSource = args.deadlineSource;
    if (args.urgency !== undefined) updates.urgency = args.urgency;
    if (args.projectId !== undefined) updates.projectId = args.projectId;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.id, updates);
  },
});

export const complete = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create activity event if part of a project
    if (task.projectId) {
      await ctx.db.insert("activityEvents", {
        userId: user._id,
        projectId: task.projectId,
        eventType: "task_completed",
        resourceType: "task",
        resourceId: args.id,
        metadata: { title: task.title },
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const task = await ctx.db.get(args.id);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    // Delete associated task tags
    const taskTags = await ctx.db
      .query("taskTags")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .collect();

    for (const taskTag of taskTags) {
      await ctx.db.delete(taskTag._id);

      // Decrement tag usage count
      const tag = await ctx.db.get(taskTag.tagId);
      if (tag) {
        await ctx.db.patch(tag._id, {
          usageCount: Math.max(0, tag.usageCount - 1),
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("suggested"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let tasks: any[];

    // Apply status filter
    if (args.status) {
      const status = args.status; // Extract to const for type narrowing
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", status),
        )
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
    }

    // Apply project filter
    if (args.projectId !== undefined) {
      tasks = tasks.filter((t) => t.projectId === args.projectId);
    }

    // Sort by deadline (ascending), then by createdAt (descending)
    return tasks.sort((a, b) => {
      // Tasks with deadlines come first
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      }
      // For tasks without deadlines, sort by creation date (newest first)
      return b.createdAt - a.createdAt;
    });
  },
});

export const getUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const days = args.days || 7;
    const now = Date.now();
    const futureDate = now + days * 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter for tasks with deadlines in the next N days
    const upcomingTasks = tasks.filter((task) => {
      if (!task.deadline) return false;
      if (task.status === "completed" || task.status === "cancelled")
        return false;
      return task.deadline >= now && task.deadline <= futureDate;
    });

    // Sort by deadline (ascending)
    return upcomingTasks.sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return a.deadline - b.deadline;
    });
  },
});

export const getToday = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get start and end of today
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter for tasks due today
    const todayTasks = tasks.filter((task) => {
      if (!task.deadline) return false;
      if (task.status === "completed" || task.status === "cancelled")
        return false;
      return task.deadline >= startOfDay && task.deadline < endOfDay;
    });

    // Sort by deadline (ascending)
    return todayTasks.sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return a.deadline - b.deadline;
    });
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== user._id) return null;

    return task;
  },
});
