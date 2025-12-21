import { streamText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// ===== Validators =====

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

// ===== Internal Queries =====

export const getPresentationInternal = internalQuery({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presentationId);
  },
});

// ===== Internal Mutations =====

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

export const checkAndCompletePresentation = internalMutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.status === "slides_complete") return;

    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q) =>
        q.eq("presentationId", args.presentationId),
      )
      .collect();

    if (slides.length === 0) return;

    const allComplete = slides.every((s) => s.imageStatus === "complete");
    if (allComplete) {
      await ctx.db.patch(args.presentationId, {
        status: "slides_complete",
        generatedSlideCount: slides.length,
        updatedAt: Date.now(),
      });
      console.log(
        `Presentation ${args.presentationId} auto-completed: all ${slides.length} slides done`,
      );
    }
  },
});

// ===== Internal Actions =====

export const generatePresentationTitle = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      // Get slides content
      const slides = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.slides.getSlidesInternal,
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
          internal.presentations.internal.updateTitleInternal,
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
