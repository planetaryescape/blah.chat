import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "./lib/userSync";

export * as description from "./presentations/description";
export * as designSystem from "./presentations/designSystem";
export * as pptxExport from "./presentations/export";
export * as generateSlides from "./presentations/generateSlides";
export * as internal from "./presentations/internal";
export * as outline from "./presentations/outline";
export * as retry from "./presentations/retry";
// ===== Re-exports from submodules =====
export * as slides from "./presentations/slides";

// ===== Validators =====

const presentationStatusValidator = v.union(
  v.literal("outline_pending"),
  v.literal("outline_generating"),
  v.literal("outline_complete"),
  v.literal("design_generating"),
  v.literal("design_complete"),
  v.literal("slides_generating"),
  v.literal("slides_complete"),
  v.literal("stopped"),
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

const slideStyleValidator = v.union(
  v.literal("wordy"),
  v.literal("illustrative"),
);

// ===== Core CRUD =====

export const create = mutation({
  args: {
    title: v.string(),
    conversationId: v.optional(v.id("conversations")),
    imageModel: v.optional(v.string()),
    slideStyle: v.optional(slideStyleValidator),
    templateId: v.optional(v.id("designTemplates")),
    aspectRatio: v.optional(
      v.union(v.literal("16:9"), v.literal("1:1"), v.literal("9:16")),
    ),
    imageStyle: v.optional(v.string()),
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
      aspectRatio: args.aspectRatio ?? "16:9",
      imageStyle: args.imageStyle,
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

        const totalCost = slides.reduce(
          (sum, s) => sum + (s.generationCost || 0),
          0,
        );
        const totalInputTokens = slides.reduce(
          (sum, s) => sum + (s.inputTokens || 0),
          0,
        );
        const totalOutputTokens = slides.reduce(
          (sum, s) => sum + (s.outputTokens || 0),
          0,
        );

        // Get thumbnail from title slide (first slide with slideType "title")
        const titleSlide = slides.find(
          (s) => s.slideType === "title" && s.position === 0,
        );
        const thumbnailStorageId =
          titleSlide?.imageStorageId ?? slides[0]?.imageStorageId;
        const thumbnailStatus =
          titleSlide?.imageStatus ?? slides[0]?.imageStatus;

        return {
          ...p,
          thumbnailStorageId,
          thumbnailStatus,
          stats: {
            totalCost,
            totalInputTokens,
            totalOutputTokens,
          },
        };
      }),
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

// ===== Status Updates =====

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

// ===== Other Operations =====

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

// ===== Backward Compatibility Re-exports =====
// These re-export functions from submodules for backward compatibility
// TODO: Update consumers to use submodule imports directly

// From internal.ts
export {
  checkAndCompletePresentation,
  generatePresentationTitle,
  getPresentationInternal,
  incrementProgressInternal,
  updateDesignSystemInternal,
  updateStatusInternal,
  updateTitleInternal,
} from "./presentations/internal";

// From outline.ts
export {
  approveOutline,
  approveOutlineFromItems,
  parseOutlineMessage,
  recreateOutlineFromSlides,
  regenerateOutlineAction,
  regenerateSlidesFromOutline,
  submitOutlineFeedback,
  updateOutlineStatusInternal,
} from "./presentations/outline";
// From retry.ts
export {
  downloadPPTX,
  regenerateSlideImage,
  retryGeneration,
  updateImageModel,
  updatePptxCache,
  updatePptxInternal,
} from "./presentations/retry";
// From slides.ts
export {
  createSlide,
  deleteSlide,
  getPendingSlides,
  getSlide,
  getSlideInternal,
  getSlides,
  getSlidesByType,
  getSlidesInternal,
  getSlidesWithIdsInternal,
  reorderSlides,
  updateSlideContent,
  updateSlideCost,
  updateSlideCostInternal,
  updateSlideImageInternal,
  updateSlideImageStatus,
} from "./presentations/slides";
