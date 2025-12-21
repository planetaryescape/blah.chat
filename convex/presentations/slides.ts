import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "../lib/userSync";

// ===== Validators =====

const slideTypeValidator = v.union(
  v.literal("title"),
  v.literal("section"),
  v.literal("content"),
);

const imageStatusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("complete"),
  v.literal("error"),
);

// ===== Public Queries =====

export const getSlide = query({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const slide = await ctx.db.get(args.slideId);
    if (!slide || slide.userId !== user._id) return null;

    return slide;
  },
});

export const getSlides = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Verify presentation ownership
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) return [];

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    return slides;
  },
});

export const getSlidesByType = query({
  args: {
    presentationId: v.id("presentations"),
    slideType: slideTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Verify presentation ownership
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) return [];

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_type", (q) =>
        q
          .eq("presentationId", args.presentationId)
          .eq("slideType", args.slideType),
      )
      .collect();

    return slides;
  },
});

export const getPendingSlides = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Verify presentation ownership
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) return [];

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .filter((q) => q.eq(q.field("imageStatus"), "pending"))
      .collect();

    return slides;
  },
});

// ===== Public Mutations =====

export const createSlide = mutation({
  args: {
    presentationId: v.id("presentations"),
    position: v.number(),
    slideType: slideTypeValidator,
    title: v.string(),
    content: v.string(),
    speakerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify presentation ownership
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    const slideId = await ctx.db.insert("slides", {
      presentationId: args.presentationId,
      userId: user._id,
      position: args.position,
      slideType: args.slideType,
      title: args.title,
      content: args.content,
      speakerNotes: args.speakerNotes,
      imageStatus: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return slideId;
  },
});

export const updateSlideContent = mutation({
  args: {
    slideId: v.id("slides"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    speakerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const slide = await ctx.db.get(args.slideId);

    if (!slide || slide.userId !== user._id) {
      throw new Error("Slide not found");
    }

    const updates: {
      title?: string;
      content?: string;
      speakerNotes?: string;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.speakerNotes !== undefined)
      updates.speakerNotes = args.speakerNotes;

    await ctx.db.patch(args.slideId, updates);
  },
});

export const updateSlideImageStatus = mutation({
  args: {
    slideId: v.id("slides"),
    imageStatus: imageStatusValidator,
    imageStorageId: v.optional(v.id("_storage")),
    imagePrompt: v.optional(v.string()),
    imageError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const slide = await ctx.db.get(args.slideId);

    if (!slide || slide.userId !== user._id) {
      throw new Error("Slide not found");
    }

    const updates: {
      imageStatus: typeof args.imageStatus;
      imageStorageId?: typeof args.imageStorageId;
      imagePrompt?: string;
      imageError?: string;
      updatedAt: number;
    } = {
      imageStatus: args.imageStatus,
      updatedAt: Date.now(),
    };

    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.imagePrompt !== undefined) {
      updates.imagePrompt = args.imagePrompt;
    }
    if (args.imageError !== undefined) {
      updates.imageError = args.imageError;
    }

    await ctx.db.patch(args.slideId, updates);
  },
});

export const updateSlideCost = mutation({
  args: {
    slideId: v.id("slides"),
    generationCost: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const slide = await ctx.db.get(args.slideId);

    if (!slide || slide.userId !== user._id) {
      throw new Error("Slide not found");
    }

    await ctx.db.patch(args.slideId, {
      generationCost: args.generationCost,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      updatedAt: Date.now(),
    });
  },
});

export const deleteSlide = mutation({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const slide = await ctx.db.get(args.slideId);

    if (!slide || slide.userId !== user._id) {
      throw new Error("Slide not found");
    }

    // Delete image from storage
    if (slide.imageStorageId) {
      await ctx.storage.delete(slide.imageStorageId);
    }

    await ctx.db.delete(args.slideId);
  },
});

export const reorderSlides = mutation({
  args: {
    presentationId: v.id("presentations"),
    slidePositions: v.array(
      v.object({
        slideId: v.id("slides"),
        position: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Verify presentation ownership
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Update positions
    for (const { slideId, position } of args.slidePositions) {
      const slide = await ctx.db.get(slideId);
      if (!slide || slide.presentationId !== args.presentationId) {
        throw new Error("Invalid slide");
      }

      await ctx.db.patch(slideId, {
        position,
        updatedAt: Date.now(),
      });
    }
  },
});

// ===== Internal Queries =====

export const getSlidesInternal = internalQuery({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    return slides.map((s) => ({
      _id: s._id,
      position: s.position,
      title: s.title,
      content: s.content,
      slideType: s.slideType,
      speakerNotes: s.speakerNotes,
      imageStorageId: s.imageStorageId,
      hasEmbeddedText: s.hasEmbeddedText,
    }));
  },
});

export const getSlideInternal = internalQuery({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slideId);
  },
});

export const getSlidesWithIdsInternal = internalQuery({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();
  },
});

// ===== Internal Mutations =====

export const updateSlideImageInternal = internalMutation({
  args: {
    slideId: v.id("slides"),
    imageStatus: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
    ),
    imageStorageId: v.optional(v.id("_storage")),
    imagePrompt: v.optional(v.string()),
    imageError: v.optional(v.string()),
    hasEmbeddedText: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      imageStatus: args.imageStatus,
      updatedAt: Date.now(),
    };

    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.imagePrompt !== undefined) {
      updates.imagePrompt = args.imagePrompt;
    }
    if (args.imageError !== undefined) {
      updates.imageError = args.imageError;
    }
    if (args.hasEmbeddedText !== undefined) {
      updates.hasEmbeddedText = args.hasEmbeddedText;
    }

    await ctx.db.patch(args.slideId, updates);
  },
});

export const updateSlideCostInternal = internalMutation({
  args: {
    slideId: v.id("slides"),
    generationCost: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      generationCost: args.generationCost,
      updatedAt: Date.now(),
    };

    if (args.inputTokens !== undefined) {
      updates.inputTokens = args.inputTokens;
    }
    if (args.outputTokens !== undefined) {
      updates.outputTokens = args.outputTokens;
    }

    await ctx.db.patch(args.slideId, updates);
  },
});
