import { streamText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../src/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "../src/lib/ai/operational-models";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

// ===== PRESENTATION STATUS TYPE =====

const presentationStatusValidator = v.union(
  v.literal("outline_pending"),
  v.literal("outline_generating"),
  v.literal("outline_complete"),
  v.literal("design_generating"),
  v.literal("design_complete"),
  v.literal("slides_generating"),
  v.literal("slides_complete"),
  v.literal("error"),
);

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

const designSystemValidator = v.object({
  theme: v.string(),
  themeRationale: v.string(),
  primaryColor: v.string(),
  secondaryColor: v.string(),
  accentColor: v.string(),
  backgroundColor: v.string(),
  fontPairings: v.object({
    heading: v.string(),
    body: v.string(),
  }),
  visualStyle: v.string(),
  layoutPrinciples: v.array(v.string()),
  iconStyle: v.string(),
  imageGuidelines: v.string(),
  designInspiration: v.string(),
});

// ===== PRESENTATIONS =====

export const create = mutation({
  args: {
    title: v.string(),
    conversationId: v.optional(v.id("conversations")),
    imageModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const presentationId = await ctx.db.insert("presentations", {
      userId: user._id,
      conversationId: args.conversationId,
      title: args.title,
      status: "outline_pending",
      imageModel: args.imageModel ?? "google:gemini-2.5-flash-preview-05-20",
      totalSlides: 0,
      generatedSlideCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return presentationId;
  },
});

export const get = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) return null;

    return presentation;
  },
});

export const listByUser = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 50;

    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return presentations;
  },
});

export const listByStatus = query({
  args: {
    status: presentationStatusValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 50;

    const presentations = await ctx.db
      .query("presentations")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", args.status),
      )
      .order("desc")
      .take(limit);

    return presentations;
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const presentation = await ctx.db
      .query("presentations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .first();

    if (!presentation || presentation.userId !== user._id) return null;

    return presentation;
  },
});

export const updateStatus = mutation({
  args: {
    presentationId: v.id("presentations"),
    status: presentationStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateDesignSystem = mutation({
  args: {
    presentationId: v.id("presentations"),
    designSystem: designSystemValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      designSystem: args.designSystem,
      updatedAt: Date.now(),
    });
  },
});

export const updateProgress = mutation({
  args: {
    presentationId: v.id("presentations"),
    totalSlides: v.optional(v.number()),
    generatedSlideCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    const updates: {
      totalSlides?: number;
      generatedSlideCount?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.totalSlides !== undefined) {
      updates.totalSlides = args.totalSlides;
    }
    if (args.generatedSlideCount !== undefined) {
      updates.generatedSlideCount = args.generatedSlideCount;
    }

    await ctx.db.patch(args.presentationId, updates);
  },
});

export const updatePptxCache = mutation({
  args: {
    presentationId: v.id("presentations"),
    pptxStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      pptxStorageId: args.pptxStorageId,
      pptxGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deletePresentation = mutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // 1. Delete all slides (cascade)
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    for (const slide of slides) {
      // Delete slide image from storage
      if (slide.imageStorageId) {
        await ctx.storage.delete(slide.imageStorageId);
      }
      await ctx.db.delete(slide._id);
    }

    // 2. Delete PPTX from storage
    if (presentation.pptxStorageId) {
      await ctx.storage.delete(presentation.pptxStorageId);
    }

    // 3. Delete presentation
    await ctx.db.delete(args.presentationId);
  },
});

// ===== SLIDES =====

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

// ===== OUTLINE WORKFLOW =====

export const linkConversation = mutation({
  args: {
    presentationId: v.id("presentations"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      conversationId: args.conversationId,
      updatedAt: Date.now(),
    });
  },
});

export const approveOutline = mutation({
  args: {
    presentationId: v.id("presentations"),
    finalOutlineMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Get presentation
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Get message with final outline
    const message = await ctx.db.get(args.finalOutlineMessageId);
    if (!message || message.role !== "assistant") {
      throw new Error("Invalid outline message");
    }

    // Import and use the parser
    const { parseOutlineMarkdown } = await import("./lib/slides/parseOutline");
    const parsedSlides = parseOutlineMarkdown(message.content);

    if (parsedSlides.length === 0) {
      throw new Error("Failed to parse outline - no slides found");
    }

    // Delete any existing slides (in case of re-approval)
    const existingSlides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    for (const slide of existingSlides) {
      if (slide.imageStorageId) {
        await ctx.storage.delete(slide.imageStorageId);
      }
      await ctx.db.delete(slide._id);
    }

    // Create slide records
    for (const slideData of parsedSlides) {
      await ctx.db.insert("slides", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: slideData.position,
        slideType: slideData.slideType,
        title: slideData.title,
        content: slideData.content,
        speakerNotes: slideData.speakerNotes,
        imageStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update presentation
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      totalSlides: parsedSlides.length,
      generatedSlideCount: 0,
      updatedAt: Date.now(),
    });

    // Schedule title generation if using placeholder
    if (presentation.title === "Untitled Presentation") {
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      await (ctx.scheduler.runAfter as any)(
        0,
        internal.presentations.generatePresentationTitle,
        {
          presentationId: args.presentationId,
        },
      );
    }

    // Schedule design system generation (Phase 3)
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await (ctx.scheduler.runAfter as any)(
      0,
      internal.presentations.designSystem.generateDesignSystem,
      { presentationId: args.presentationId },
    );

    return { slideCount: parsedSlides.length };
  },
});

// ===== INTERNAL MUTATIONS =====

export const updateTitleInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatusInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    status: presentationStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateDesignSystemInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    designSystem: designSystemValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      designSystem: args.designSystem,
      updatedAt: Date.now(),
    });
  },
});

// ===== INTERNAL ACTIONS =====

export const generatePresentationTitle = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      // Get slides content
      const slides = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getSlidesInternal,
        { presentationId: args.presentationId },
      )) as Array<{ title: string; content: string }>;

      if (slides.length === 0) return;

      // Build content summary (limit to 2000 chars)
      const content = slides
        .map((s) => `${s.title}: ${s.content}`)
        .join("\n")
        .slice(0, 2000);

      // Generate title
      const result = streamText({
        model: getModel(TITLE_GENERATION_MODEL.id),
        prompt: `Generate a 3-6 word title for this presentation:

${content}

Output only the title, no quotes or punctuation at the end.`,
        providerOptions: getGatewayOptions(
          TITLE_GENERATION_MODEL.id,
          undefined,
          ["title-generation"],
        ),
      });

      let title = "";
      for await (const chunk of result.textStream) {
        title += chunk;
      }

      // Clean up title
      title = title
        .trim()
        .replace(/^["']|["']$/g, "")
        .trim();

      if (title) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.updateTitleInternal,
          {
            presentationId: args.presentationId,
            title,
          },
        );
      }
    } catch (error) {
      console.error("Presentation title generation failed:", error);
      // Keep "Untitled Presentation" on failure
    }
  },
});

// Internal query for getting slides (used by generatePresentationTitle, generateDesignSystem)
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
      title: s.title,
      content: s.content,
      slideType: s.slideType,
      speakerNotes: s.speakerNotes,
    }));
  },
});
