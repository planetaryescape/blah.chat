import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const sourceFileValidator = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  type: v.union(v.literal("pdf"), v.literal("pptx"), v.literal("image")),
});

const extractedDesignValidator = v.object({
  colors: v.object({
    primary: v.string(),
    secondary: v.string(),
    accent: v.optional(v.string()),
    background: v.string(),
    text: v.string(),
  }),
  fonts: v.object({
    heading: v.string(),
    body: v.string(),
    fallbackHeading: v.optional(v.string()),
    fallbackBody: v.optional(v.string()),
  }),
  logoGuidelines: v.optional(
    v.object({
      position: v.string(),
      size: v.string(),
      description: v.optional(v.string()),
    }),
  ),
  layoutPatterns: v.array(v.string()),
  visualStyle: v.string(),
  iconStyle: v.optional(v.string()),
  analysisNotes: v.string(),
});

/**
 * Create a new design template
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sourceFiles: v.array(sourceFileValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const templateId = await ctx.db.insert("designTemplates", {
      userId: user._id,
      name: args.name,
      description: args.description,
      sourceFiles: args.sourceFiles,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule template analysis
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.designTemplates.analyze.analyzeTemplate,
      { templateId },
    );

    return templateId;
  },
});

/**
 * Get a template by ID
 */
export const get = query({
  args: { templateId: v.id("designTemplates") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || template.userId !== user._id) {
      return null;
    }

    return template;
  },
});

/**
 * List all templates for the current user
 */
export const listByUser = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("complete"),
        v.literal("error"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const query = ctx.db
      .query("designTemplates")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const templates = await query.collect();

    // Filter by status if provided
    if (args.status) {
      return templates.filter((t) => t.status === args.status);
    }

    return templates;
  },
});

/**
 * Delete a template and its files
 */
export const remove = mutation({
  args: { templateId: v.id("designTemplates") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || template.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete source files from storage
    for (const file of template.sourceFiles) {
      try {
        await ctx.storage.delete(file.storageId);
      } catch (e) {
        console.error("Failed to delete template file:", e);
      }
    }

    // Delete template record
    await ctx.db.delete(args.templateId);

    return { success: true };
  },
});

/**
 * Generate upload URL for template files
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Internal mutation to update template status
 */
export const updateStatusInternal = internalMutation({
  args: {
    templateId: v.id("designTemplates"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to save extracted design and logo
 */
export const saveExtractedDesignInternal = internalMutation({
  args: {
    templateId: v.id("designTemplates"),
    extractedDesign: extractedDesignValidator,
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      extractedDesign: args.extractedDesign,
      logoStorageId: args.logoStorageId,
      status: "complete",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get template for internal use (in actions)
 */
export const getInternal = internalQuery({
  args: { templateId: v.id("designTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});
