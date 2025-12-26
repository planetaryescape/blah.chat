import { streamText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
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

// ===== Streaming Outline Polling =====

/**
 * Poll for new complete slides during outline generation.
 * Called by scheduler every 500ms while status is "outline_generating".
 * Parses partialContent and inserts newly completed slides.
 */
export const pollOutlineProgress = internalMutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);

    // Stop polling if presentation doesn't exist or isn't generating
    if (!presentation || presentation.status !== "outline_generating") {
      return { done: true, reason: "not_generating" };
    }

    // Need conversation to find the streaming message
    if (!presentation.conversationId) {
      return { done: false, reschedule: true, reason: "no_conversation" };
    }

    // Get the latest assistant message (may be generating)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", presentation.conversationId!),
      )
      .order("desc")
      .take(5);

    const assistantMessage = messages.find((m) => m.role === "assistant");

    if (!assistantMessage) {
      // Message not created yet, reschedule
      await ctx.scheduler.runAfter(
        500,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.outline.pollOutlineProgress,
        { presentationId: args.presentationId },
      );
      return { done: false, reschedule: true, reason: "no_message" };
    }

    // Get current content (prefer partialContent during streaming)
    const content =
      assistantMessage.status === "generating"
        ? assistantMessage.partialContent || ""
        : assistantMessage.content || "";

    if (content.length < 50) {
      // Not enough content yet
      await ctx.scheduler.runAfter(
        500,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.outline.pollOutlineProgress,
        { presentationId: args.presentationId },
      );
      return { done: false, reschedule: true, reason: "content_too_short" };
    }

    // Get existing outline items count
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    // Parse current content
    const parsedSlides = parseOutlineMarkdown(content);

    // Only insert slides we haven't seen yet (by position)
    const existingPositions = new Set(existingItems.map((i) => i.position));
    const newSlides = parsedSlides.filter(
      (s) => !existingPositions.has(s.position),
    );

    const now = Date.now();
    for (const slideData of newSlides) {
      await ctx.db.insert("outlineItems", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: slideData.position,
        slideType: slideData.slideType,
        title: slideData.title,
        content: slideData.content,
        speakerNotes: slideData.speakerNotes,
        visualDirection: slideData.visualDirection,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // If message is still generating, reschedule
    if (assistantMessage.status === "generating") {
      await ctx.scheduler.runAfter(
        500,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.outline.pollOutlineProgress,
        { presentationId: args.presentationId },
      );
      return {
        done: false,
        reschedule: true,
        inserted: newSlides.length,
        total: existingItems.length + newSlides.length,
      };
    }

    // Message complete - do final parse and update status
    // This is handled by parseOutlineMessageInternal triggered from generation.ts
    return {
      done: true,
      inserted: newSlides.length,
      total: existingItems.length + newSlides.length,
    };
  },
});

// ===== Internal Queries =====

export const getOutlineItemsInternal = internalQuery({
  args: {
    presentationId: v.id("presentations"),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation_version", (q) =>
        q.eq("presentationId", args.presentationId).eq("version", args.version),
      )
      .collect();

    return items.sort((a, b) => a.position - b.position);
  },
});

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
        visualDirection: slideData.visualDirection,
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

    // Note: Title generation happens in parseOutlineMessageInternal

    // Schedule design system generation (Phase 3)
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    await (ctx.scheduler.runAfter as any)(
      0,
      internal.presentations.designSystem.generateDesignSystem,
      { presentationId: args.presentationId },
    );

    // Schedule embedding generation for semantic search
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.embeddings.generateEmbedding,
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
        visualDirection: item.visualDirection,
        imageStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update presentation - set to slides_generating since we're about to start
    await ctx.db.patch(args.presentationId, {
      status: "slides_generating",
      totalSlides: sortedItems.length,
      generatedSlideCount: 0,
      outlineStatus: undefined, // Clear outline status
      overallFeedback: undefined, // Clear feedback
      updatedAt: Date.now(),
    });

    // Note: Title generation happens in parseOutlineMessageInternal

    // Design system already generated after outline - go directly to slide generation
    // Check if design system exists, if not generate it first
    if (presentation.designSystem) {
      // Design already exists, go directly to slides
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.generateSlides.generateSlides,
        { presentationId: args.presentationId },
      );
    } else {
      // Fallback: design system missing, generate it (will trigger slides)
      await (ctx.scheduler.runAfter as any)(
        0,
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.designSystem.generateDesignSystem,
        { presentationId: args.presentationId },
      );
    }

    // Schedule description generation (runs in parallel)
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.description.generateDescriptionAction,
      { presentationId: args.presentationId },
    );

    // Schedule embedding generation for semantic search
    await (ctx.scheduler.runAfter as any)(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.embeddings.generateEmbedding,
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
        visualDirection: item.visualDirection,
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
        visualDirection: slide.visualDirection,
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
        visualDirection: slideData.visualDirection,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update presentation - mark as outline_complete so UI can proceed
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      currentOutlineVersion: 1,
      outlineStatus: "ready",
      totalSlides: parsedSlides.length,
      updatedAt: now,
    });

    return { itemCount: parsedSlides.length, alreadyParsed: false };
  },
});

/**
 * Internal version of parseOutlineMessage for use by generation.ts
 * Does not require authentication - uses userId from args
 */
export const parseOutlineMessageInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== args.userId) {
      console.error(
        "[parseOutlineMessageInternal] Presentation not found or user mismatch",
      );
      return { itemCount: 0, error: "Presentation not found" };
    }

    // Check if outlineItems already exist
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .first();

    if (existingItems) {
      // Items already exist (from streaming), still need to update status and trigger design gen
      console.log(
        "[parseOutlineMessageInternal] Items already exist, updating status",
      );

      // Get all items for count
      const allItems = await ctx.db
        .query("outlineItems")
        .withIndex("by_presentation", (q) =>
          q.eq("presentationId", args.presentationId),
        )
        .collect();

      // STILL update status to outline_complete
      await ctx.db.patch(args.presentationId, {
        status: "outline_complete",
        currentOutlineVersion: 1,
        outlineStatus: "ready",
        totalSlides: allItems.length,
        updatedAt: Date.now(),
      });

      // Generate presentation title from outline if still untitled
      if (presentation.title === "Untitled Presentation") {
        const titleSlide = allItems.find((item) => item.slideType === "title");
        if (titleSlide?.title) {
          // Use title slide's title as presentation title
          await ctx.db.patch(args.presentationId, {
            title: titleSlide.title,
          });
        } else {
          // No title slide - schedule title generation from outline content
          await ctx.scheduler.runAfter(
            0,
            internal.presentations.internal.generatePresentationTitle,
            { presentationId: args.presentationId },
          );
        }
      }

      // STILL trigger design system generation
      await ctx.scheduler.runAfter(
        0,
        internal.presentations.designSystem.generateDesignSystemFromOutline,
        { presentationId: args.presentationId },
      );

      return { itemCount: allItems.length, alreadyParsed: true };
    }

    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (
      !message ||
      message.role !== "assistant" ||
      message.status !== "complete"
    ) {
      console.error("[parseOutlineMessageInternal] Invalid message:", {
        exists: !!message,
        role: message?.role,
        status: message?.status,
      });
      return { itemCount: 0, error: "Invalid message for parsing" };
    }

    // Check for minimum content
    const content = message.content?.trim() || "";
    if (content.length < 50) {
      console.warn(
        "[parseOutlineMessageInternal] Content too short:",
        content.length,
      );
      return { itemCount: 0, alreadyParsed: false, error: "Content too short" };
    }

    // Parse the outline
    const parsedSlides = parseOutlineMarkdown(content);

    if (parsedSlides.length === 0) {
      console.error(
        "[parseOutlineMessageInternal] Failed to parse outline. Content preview:",
        content.substring(0, 500),
      );
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
        userId: args.userId,
        position: slideData.position,
        slideType: slideData.slideType,
        title: slideData.title,
        content: slideData.content,
        speakerNotes: slideData.speakerNotes,
        visualDirection: slideData.visualDirection,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update presentation - mark as outline_complete so UI can proceed
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      currentOutlineVersion: 1,
      outlineStatus: "ready",
      totalSlides: parsedSlides.length,
      updatedAt: now,
    });

    // Generate presentation title from outline if still untitled
    if (presentation.title === "Untitled Presentation") {
      const titleSlide = parsedSlides.find(
        (slide) => slide.slideType === "title",
      );
      if (titleSlide?.title) {
        // Use title slide's title as presentation title
        await ctx.db.patch(args.presentationId, {
          title: titleSlide.title,
        });
      } else {
        // No title slide - schedule title generation from outline content
        await ctx.scheduler.runAfter(
          0,
          internal.presentations.internal.generatePresentationTitle,
          { presentationId: args.presentationId },
        );
      }
    }

    // Trigger design system generation (runs automatically after outline)
    await ctx.scheduler.runAfter(
      0,
      internal.presentations.designSystem.generateDesignSystemFromOutline,
      { presentationId: args.presentationId },
    );

    console.log(
      "[parseOutlineMessageInternal] Successfully parsed",
      parsedSlides.length,
      "slides, triggered design system generation",
    );
    return { itemCount: parsedSlides.length, alreadyParsed: false };
  },
});

/**
 * Repair a stuck presentation by re-parsing its outline from the conversation.
 * Use this when a presentation is stuck in "outline_pending" or "outline_generating" state.
 */
export const repairStuckOutline = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Only allow repair on stuck presentations
    if (
      presentation.status !== "outline_pending" &&
      presentation.status !== "outline_generating"
    ) {
      return { success: false, reason: "Presentation is not stuck" };
    }

    // Get the conversation linked to this presentation
    if (!presentation.conversationId) {
      throw new Error("No conversation linked to this presentation");
    }

    // Get the last assistant message from the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", presentation.conversationId!),
      )
      .order("desc")
      .collect();

    const lastAssistantMessage = messages.find(
      (m) => m.role === "assistant" && m.status === "complete",
    );

    if (!lastAssistantMessage) {
      // No complete message yet - conversation might still be generating
      // Set status to error so user can try again
      await ctx.db.patch(args.presentationId, {
        status: "error",
        updatedAt: Date.now(),
      });
      return {
        success: false,
        reason:
          "No complete AI response found. Please try creating a new presentation.",
      };
    }

    // Check for minimum content
    const content = lastAssistantMessage.content?.trim() || "";
    if (content.length < 50) {
      await ctx.db.patch(args.presentationId, {
        status: "error",
        updatedAt: Date.now(),
      });
      return { success: false, reason: "AI response too short to parse" };
    }

    // Parse the outline
    const parsedSlides = parseOutlineMarkdown(content);

    if (parsedSlides.length === 0) {
      await ctx.db.patch(args.presentationId, {
        status: "error",
        updatedAt: Date.now(),
      });
      return {
        success: false,
        reason: "Could not parse slides from AI response",
      };
    }

    // Delete any existing outline items for this presentation
    const existingItems = await ctx.db
      .query("outlineItems")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    for (const item of existingItems) {
      await ctx.db.delete(item._id);
    }

    // Create new outline items
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
        visualDirection: slideData.visualDirection,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update presentation status
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      currentOutlineVersion: 1,
      outlineStatus: "ready",
      totalSlides: parsedSlides.length,
      updatedAt: now,
    });

    return { success: true, slideCount: parsedSlides.length };
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

      // Get AI model - using gpt-oss-120b via Cerebras for fast inference
      const model = getModel("openai:gpt-oss-120b");

      // Generate new outline
      const result = await streamText({
        model,
        system: OUTLINE_FEEDBACK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: feedbackPrompt }],
        ...getGatewayOptions("openai:gpt-oss-120b"),
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
            visualDirection: slide.visualDirection,
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
