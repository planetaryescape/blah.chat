import { streamText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
} from "../_generated/server";
import {
  buildFeedbackPrompt,
  OUTLINE_FEEDBACK_SYSTEM_PROMPT,
} from "../lib/prompts/operational/outlineFeedback";
import { parseOutlineMarkdown } from "../lib/slides/parseOutline";
import { getCurrentUserOrCreate } from "../lib/userSync";

// ===== Validators =====

const outlineStatusValidator = v.union(
  v.literal("draft"),
  v.literal("feedback_pending"),
  v.literal("regenerating"),
  v.literal("ready"),
);

// ===== Public Mutations =====

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
        internal.presentations.internal.generatePresentationTitle,
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
      internal.presentations.outline.regenerateOutlineAction,
      { presentationId: args.presentationId },
    );
  },
});

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
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
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
        internal.presentations.internal.generatePresentationTitle,
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
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
      )
      .collect();

    if (items.length === 0) {
      throw new Error(
        "No outline items found. Please create an outline first.",
      );
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
        q
          .eq("presentationId", args.presentationId)
          .eq("version", currentVersion),
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
    if (
      !message ||
      message.role !== "assistant" ||
      message.status !== "complete"
    ) {
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
      console.error(
        "Failed to parse outline. Content preview:",
        content.substring(0, 500),
      );
      // Return gracefully instead of throwing - allow retry
      return {
        itemCount: 0,
        alreadyParsed: false,
        error: "No slides found in content",
      };
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

// ===== Internal Actions =====

export const regenerateOutlineAction = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      // Get presentation
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.internal.getPresentationInternal,
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
        internal.presentations.outline.updateOutlineStatusInternal,
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
        internal.presentations.outline.updateOutlineStatusInternal,
        {
          presentationId: args.presentationId,
          outlineStatus: "ready", // Back to ready so user can try again
        },
      );
    }
  },
});

// ===== Internal Mutations =====

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
