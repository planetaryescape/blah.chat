import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "../lib/userSync";

// ===== Public Mutations =====

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

    // Fetch logo data from template if available
    let logoStorageId: Id<"_storage"> | undefined;
    let logoGuidelines: { position: string; size: string } | undefined;

    if (presentation.templateId) {
      const template = await ctx.db.get(presentation.templateId);
      if (template) {
        logoStorageId = template.logoStorageId;
        logoGuidelines = template.extractedDesign?.logoGuidelines as
          | { position: string; size: string }
          | undefined;
      }
    }

    // Schedule the regeneration action with custom prompt and context
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.generation.slideImage.generateSlideImage,
      {
        slideId: args.slideId,
        modelId: presentation.imageModel,
        designSystem: presentation.designSystem,
        contextSlides,
        customPrompt: args.customPrompt,
        slideStyle: presentation.slideStyle ?? "illustrative",
        isTemplateBased: !!presentation.templateId,
        logoStorageId,
        logoGuidelines,
      },
    );

    return { success: true };
  },
});

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

export const retryGeneration = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    const status = presentation.status;

    // Handle design_generating - reset and retry design system
    if (status === "design_generating") {
      await ctx.db.patch(args.presentationId, {
        status: "outline_complete",
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.designSystem.generateDesignSystem,
        { presentationId: args.presentationId },
      );
      return { success: true, retried: "design_system" };
    }

    // Handle design_complete - retry slide generation
    if (status === "design_complete") {
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.generateSlides.generateSlides,
        { presentationId: args.presentationId },
      );
      return { success: true, retried: "slides" };
    }

    // Handle slides_generating - reset pending slides and retry
    if (status === "slides_generating") {
      // Reset all pending/error slides back to pending
      const slides = await ctx.db
        .query("slides")
        .withIndex("by_presentation", (q) =>
          q.eq("presentationId", args.presentationId),
        )
        .collect();

      const pendingSlides = slides.filter(
        (s) => s.imageStatus === "pending" || s.imageStatus === "error",
      );

      if (pendingSlides.length === 0) {
        // All slides complete, update presentation status
        await ctx.db.patch(args.presentationId, {
          status: "slides_complete",
          updatedAt: Date.now(),
        });
        return { success: true, retried: "status_fixed" };
      }

      // Reset to design_complete and retry slide generation
      await ctx.db.patch(args.presentationId, {
        status: "design_complete",
        generatedSlideCount: slides.length - pendingSlides.length,
        updatedAt: Date.now(),
      });

      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.generateSlides.generateSlides,
        { presentationId: args.presentationId },
      );
      return {
        success: true,
        retried: "slides",
        pendingCount: pendingSlides.length,
      };
    }

    // Handle outline_complete - start design system
    if (status === "outline_complete") {
      await ctx.scheduler.runAfter(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.designSystem.generateDesignSystem,
        { presentationId: args.presentationId },
      );
      return { success: true, retried: "design_system" };
    }

    return { success: false, reason: `Cannot retry from status: ${status}` };
  },
});

// ===== Internal Mutations =====

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
