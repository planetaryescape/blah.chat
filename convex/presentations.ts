import { getModel } from "@/lib/ai/registry";
import { streamText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "../src/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "../src/lib/ai/operational-models";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
    internalAction,
    internalMutation,
    internalQuery,
    mutation,
    query,
} from "./_generated/server";
import {
    buildFeedbackPrompt,
    OUTLINE_FEEDBACK_SYSTEM_PROMPT,
} from "./lib/prompts/operational/outlineFeedback";
import { parseOutlineMarkdown } from "./lib/slides/parseOutline";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

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

const outlineStatusValidator = v.union(
  v.literal("draft"),
  v.literal("feedback_pending"),
  v.literal("regenerating"),
  v.literal("ready"),
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

const slideStyleValidator = v.union(
  v.literal("wordy"),
  v.literal("illustrative"),
);

export const create = mutation({
  args: {
    title: v.string(),
    conversationId: v.optional(v.id("conversations")),
    imageModel: v.optional(v.string()),
    slideStyle: v.optional(slideStyleValidator),
    templateId: v.optional(v.id("designTemplates")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    // Check daily presentation limit (admins exempt)
    if (!user.isAdmin) {
      const adminSettings = await ctx.db.query("adminSettings").first();
      const dailyLimit = adminSettings?.defaultDailyPresentationLimit ?? 1;

      // Only enforce if limit > 0 (0 = unlimited)
      if (dailyLimit > 0) {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        // Reset count if new day
        let currentCount = user.dailyPresentationCount ?? 0;
        if (user.lastPresentationDate !== today) {
          currentCount = 0;
        }

        // Check limit
        if (currentCount >= dailyLimit) {
          throw new Error(
            `Daily presentation limit reached (${dailyLimit} per day). Try again tomorrow.`,
          );
        }

        // Increment count
        await ctx.db.patch(user._id, {
          dailyPresentationCount: currentCount + 1,
          lastPresentationDate: today,
        });
      }
    }

    const presentationId = await ctx.db.insert("presentations", {
      userId: user._id,
      conversationId: args.conversationId,
      title: args.title,
      status: "outline_pending",
      imageModel: args.imageModel ?? "google:gemini-3-pro-image-preview",
      slideStyle: args.slideStyle ?? "illustrative",
      templateId: args.templateId,
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

    // Get PPTX URL if available
    let pptxUrl: string | null = null;
    if (presentation.pptxStorageId) {
      pptxUrl = await ctx.storage.getUrl(presentation.pptxStorageId);
    }

    return { ...presentation, pptxUrl };
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

export const listByUserWithStats = query({
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

    // Fetch aggregated stats for each presentation
    const presentationsWithStats = await Promise.all(
      presentations.map(async (p) => {
        const slides = await ctx.db
          .query("slides")
          .withIndex("by_presentation", (q) => q.eq("presentationId", p._id))
          .collect();

        const totalCost = slides.reduce((sum, s) => sum + (s.generationCost || 0), 0);
        const totalInputTokens = slides.reduce((sum, s) => sum + (s.inputTokens || 0), 0);
        const totalOutputTokens = slides.reduce((sum, s) => sum + (s.outputTokens || 0), 0);

        return {
          ...p,
          stats: {
            totalCost,
            totalInputTokens,
            totalOutputTokens,
          },
        };
      })
    );

    return presentationsWithStats;
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

export const updateTitle = mutation({
  args: {
    presentationId: v.id("presentations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      title: args.title,
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

    // Use the parser
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
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
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

// Internal query for getting slides (used by generatePresentationTitle, generateDesignSystem, PPTX export)
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

// Internal query for getting a single slide
export const getSlideInternal = internalQuery({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slideId);
  },
});

// Internal query for getting presentation with all data
export const getPresentationInternal = internalQuery({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presentationId);
  },
});

// Internal query to get all slides with IDs (for image generation)
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

// Increment generated slide count (progress tracking)
export const incrementProgressInternal = internalMutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) return;

    await ctx.db.patch(args.presentationId, {
      generatedSlideCount: (presentation.generatedSlideCount || 0) + 1,
      updatedAt: Date.now(),
    });
  },
});

// Update slide image status and data
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

// Update slide generation cost (separate from status for atomic updates)
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

// Update image model selection
export const updateImageModel = mutation({
  args: {
    presentationId: v.id("presentations"),
    imageModel: v.string(),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    const user = await getCurrentUser(ctx);
    if (!user || presentation.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.presentationId, {
      imageModel: args.imageModel,
      updatedAt: Date.now(),
    });
  },
});

// ===== CARD-BASED OUTLINE EDITOR =====

/**
 * Submit feedback and trigger outline regeneration
 */
export const submitOutlineFeedback = mutation({
  args: {
    presentationId: v.id("presentations"),
    overallFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Store overall feedback
    await ctx.db.patch(args.presentationId, {
      overallFeedback: args.overallFeedback || undefined,
      outlineStatus: "regenerating",
      updatedAt: Date.now(),
    });

    // Schedule regeneration action
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.regenerateOutlineAction,
      { presentationId: args.presentationId },
    );
  },
});

/**
 * Regenerate outline from feedback (internal action)
 */
export const regenerateOutlineAction = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      // Get presentation
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as Doc<"presentations"> | null;

      if (!presentation) {
        throw new Error("Presentation not found");
      }

      // Get current outline items
      const items = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.outlineItems.listByPresentationInternal,
        { presentationId: args.presentationId },
      )) as Doc<"outlineItems">[];

      if (items.length === 0) {
        throw new Error("No outline items to regenerate from");
      }

      // Build feedback prompt
      const feedbackPrompt = buildFeedbackPrompt(
        items,
        presentation.overallFeedback,
      );

      // Get AI model
      const model = getModel("zai:glm-4.6");

      // Generate new outline
      const result = await streamText({
        model,
        system: OUTLINE_FEEDBACK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: feedbackPrompt }],
        ...getGatewayOptions("zai:glm-4.6"),
      });

      // Get full response
      const fullText = await result.text;

      // Parse new outline
      const parsedSlides = parseOutlineMarkdown(fullText);

      if (parsedSlides.length === 0) {
        throw new Error("Failed to parse regenerated outline");
      }

      // Get current version and increment
      const currentVersion = presentation.currentOutlineVersion ?? 1;
      const newVersion = currentVersion + 1;

      // Delete old outline items
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.outlineItems.deleteByPresentation,
        { presentationId: args.presentationId, version: currentVersion },
      );

      // Create new outline items
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.outlineItems.createBatch,
        {
          presentationId: args.presentationId,
          userId: presentation.userId,
          version: newVersion,
          items: parsedSlides.map((slide) => ({
            position: slide.position,
            slideType: slide.slideType,
            title: slide.title,
            content: slide.content,
            speakerNotes: slide.speakerNotes,
          })),
        },
      );

      // Clear overall feedback after regeneration
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateOutlineStatusInternal,
        {
          presentationId: args.presentationId,
          outlineStatus: "ready",
          overallFeedback: undefined,
        },
      );
    } catch (error) {
      console.error("Outline regeneration failed:", error);

      // Update status to indicate error
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateOutlineStatusInternal,
        {
          presentationId: args.presentationId,
          outlineStatus: "ready", // Back to ready so user can try again
        },
      );
    }
  },
});

/**
 * Update outline status (internal)
 */
export const updateOutlineStatusInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    outlineStatus: outlineStatusValidator,
    overallFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      outlineStatus: args.outlineStatus,
      updatedAt: Date.now(),
    };

    if (args.overallFeedback !== undefined) {
      updates.overallFeedback = args.overallFeedback || undefined;
    }

    await ctx.db.patch(args.presentationId, updates);
  },
});

/**
 * Approve outline from outlineItems (creates slides)
 */
export const approveOutlineFromItems = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Get current outline items
    const currentVersion = presentation.currentOutlineVersion ?? 1;
    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", currentVersion),
      )
      .collect();

    if (items.length === 0) {
      throw new Error("No outline items to approve");
    }

    // Sort by position
    const sortedItems = items.sort((a, b) => a.position - b.position);

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

    // Create slide records from outline items
    for (const item of sortedItems) {
      await ctx.db.insert("slides", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: item.position,
        slideType: item.slideType,
        title: item.title,
        content: item.content,
        speakerNotes: item.speakerNotes,
        imageStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update presentation
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      totalSlides: sortedItems.length,
      generatedSlideCount: 0,
      outlineStatus: undefined, // Clear outline status
      overallFeedback: undefined, // Clear feedback
      updatedAt: Date.now(),
    });

    // Schedule title generation if using placeholder
    if (presentation.title === "Untitled Presentation") {
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.generatePresentationTitle,
        { presentationId: args.presentationId },
      );
    }

    // Schedule design system generation
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.designSystem.generateDesignSystem,
      { presentationId: args.presentationId },
    );

    // NOTE: Outline items are preserved for future editing/regeneration

    return { slideCount: sortedItems.length };
  },
});

/**
 * Regenerate slides from the current outline items
 * Deletes existing slides and creates new ones from the outline
 */
export const regenerateSlidesFromOutline = mutation({
  args: {
    presentationId: v.id("presentations"),
    imageModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Get current outline items
    const currentVersion = presentation.currentOutlineVersion ?? 1;
    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", currentVersion),
      )
      .collect();

    if (items.length === 0) {
      throw new Error("No outline items found. Please create an outline first.");
    }

    // Sort by position
    const sortedItems = items.sort((a, b) => a.position - b.position);

    // Delete existing slides and their images
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

    // Delete cached PPTX if exists
    if (presentation.pptxStorageId) {
      await ctx.storage.delete(presentation.pptxStorageId);
    }

    // Create new slide records from outline items
    for (const item of sortedItems) {
      await ctx.db.insert("slides", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: item.position,
        slideType: item.slideType,
        title: item.title,
        content: item.content,
        speakerNotes: item.speakerNotes,
        imageStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update presentation status
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      totalSlides: sortedItems.length,
      generatedSlideCount: 0,
      pptxStorageId: undefined,
      pptxGeneratedAt: undefined,
      updatedAt: Date.now(),
      ...(args.imageModel && { imageModel: args.imageModel }),
    });

    // Schedule design system generation (will then trigger slide image generation)
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.designSystem.generateDesignSystem,
      { presentationId: args.presentationId },
    );

    return { slideCount: sortedItems.length };
  },
});

/**
 * Recreate outline items from existing slides
 * Used when outline items are missing but slides exist (legacy presentations)
 */
export const recreateOutlineFromSlides = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Get existing slides
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    if (slides.length === 0) {
      throw new Error("No slides found to recreate outline from");
    }

    // Check if outline items already exist
    const currentVersion = presentation.currentOutlineVersion ?? 1;
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", currentVersion),
      )
      .collect();

    if (existingItems.length > 0) {
      // Outline items already exist, no need to recreate
      return { itemCount: existingItems.length, recreated: false };
    }

    // Sort slides by position
    const sortedSlides = slides.sort((a, b) => a.position - b.position);

    // Create outline items from slides
    for (const slide of sortedSlides) {
      await ctx.db.insert("outlineItems", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: slide.position,
        slideType: slide.slideType,
        title: slide.title,
        content: slide.content,
        speakerNotes: slide.speakerNotes,
        version: currentVersion,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { itemCount: sortedSlides.length, recreated: true };
  },
});

/**
 * Parse outline from assistant message and create outlineItems
 * Called when outline page detects a complete message but no outlineItems
 */
export const parseOutlineMessage = mutation({
  args: {
    presentationId: v.id("presentations"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Check if outlineItems already exist
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .first();

    if (existingItems) {
      // Items already exist, no need to parse again
      return { itemCount: 0, alreadyParsed: true };
    }

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message || message.role !== "assistant" || message.status !== "complete") {
      throw new Error("Invalid message for parsing");
    }

    // Check for minimum content
    const content = message.content?.trim() || "";
    if (content.length < 50) {
      console.warn("Message content too short to parse:", content);
      return { itemCount: 0, alreadyParsed: false, error: "Content too short" };
    }

    // Parse the outline
    const parsedSlides = parseOutlineMarkdown(content);

    if (parsedSlides.length === 0) {
      console.error("Failed to parse outline. Content preview:", content.substring(0, 500));
      // Return gracefully instead of throwing - allow retry
      return { itemCount: 0, alreadyParsed: false, error: "No slides found in content" };
    }

    // Create outlineItems
    const now = Date.now();
    for (const slideData of parsedSlides) {
      await ctx.db.insert("outlineItems", {
        presentationId: args.presentationId,
        userId: user._id,
        position: slideData.position,
        slideType: slideData.slideType,
        title: slideData.title,
        content: slideData.content,
        speakerNotes: slideData.speakerNotes,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update presentation
    await ctx.db.patch(args.presentationId, {
      currentOutlineVersion: 1,
      outlineStatus: "ready",
      updatedAt: now,
    });

    return { itemCount: parsedSlides.length, alreadyParsed: false };
  },
});

/**
 * Regenerate a single slide's image
 */
export const regenerateSlideImage = mutation({
  args: {
    slideId: v.id("slides"),
    customPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const slide = await ctx.db.get(args.slideId);
    if (!slide || slide.userId !== user._id) {
      throw new Error("Slide not found");
    }

    const presentation = await ctx.db.get(slide.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    // Build context slides (like batch generation does)
    const allSlides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", slide.presentationId),
      )
      .collect();

    const contextSlides: Array<{ type: string; title: string }> = [];

    if (slide.slideType === "section" || slide.slideType === "content") {
      const titleSlides = allSlides.filter((s) => s.slideType === "title");
      if (titleSlides.length > 0) {
        contextSlides.push({ type: "title", title: titleSlides[0].title });
      }
    }

    if (slide.slideType === "content") {
      const sectionSlides = allSlides
        .filter((s) => s.slideType === "section")
        .slice(0, 3);
      contextSlides.push(
        ...sectionSlides.map((s) => ({ type: "section", title: s.title })),
      );
    }

    // Reset image status
    await ctx.db.patch(args.slideId, {
      imageStatus: "pending",
      imageError: undefined,
      updatedAt: Date.now(),
    });

    // Clear PPTX cache (regenerated slide invalidates cached PPTX)
    if (presentation.pptxStorageId) {
      try {
        await ctx.storage.delete(presentation.pptxStorageId);
      } catch (e) {
        console.error("Failed to delete cached PPTX:", e);
      }
      await ctx.db.patch(presentation._id, {
        pptxStorageId: undefined,
        pptxGeneratedAt: undefined,
        updatedAt: Date.now(),
      });
    }

    // Schedule the regeneration action with custom prompt and context
    await ctx.scheduler.runAfter(0, internal.generation.slideImage.generateSlideImage, {
      slideId: args.slideId,
      modelId: presentation.imageModel,
      designSystem: presentation.designSystem,
      contextSlides,
      customPrompt: args.customPrompt,
      slideStyle: presentation.slideStyle ?? "illustrative",
      isTemplateBased: !!presentation.templateId,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to update PPTX storage (called by export action)
 */
export const updatePptxInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    pptxStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    // Delete old PPTX if exists
    if (presentation.pptxStorageId) {
      try {
        await ctx.storage.delete(presentation.pptxStorageId);
      } catch (e) {
        console.error("Failed to delete old PPTX:", e);
      }
    }

    await ctx.db.patch(args.presentationId, {
      pptxStorageId: args.pptxStorageId,
      pptxGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Download PPTX - returns URL if cached, triggers generation if not
 */
export const downloadPPTX = mutation({
  args: {
    presentationId: v.id("presentations"),
    forceRegenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    if (presentation.status !== "slides_complete") {
      throw new Error("Slides not fully generated yet");
    }

    // If already cached and not forcing regeneration, return URL
    if (presentation.pptxStorageId && !args.forceRegenerate) {
      const url = await ctx.storage.getUrl(presentation.pptxStorageId);
      if (url) {
        return { success: true, url, cached: true };
      }
    }

    // If forcing regeneration, delete old PPTX and clear cache
    if (args.forceRegenerate && presentation.pptxStorageId) {
      await ctx.storage.delete(presentation.pptxStorageId);
      await ctx.db.patch(args.presentationId, {
        pptxStorageId: undefined,
        pptxGeneratedAt: undefined,
      });
    }

    // Trigger generation
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.export.generatePPTX,
      { presentationId: args.presentationId },
    );

    // Return generating status - client will poll
    return { success: true, generating: true, cached: false };
  },
});
