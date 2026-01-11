import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
} from "../_generated/server";
import { logger } from "../lib/logger";
import {
  buildDescriptionPrompt,
  DESCRIPTION_SYSTEM_PROMPT,
} from "../lib/prompts/operational/presentationDescription";
import { getCurrentUserOrCreate } from "../lib/userSync";

// Model for description generation - fast and cheap via Cerebras
const DESCRIPTION_MODEL = "openai:gpt-oss-20b";

// ===== Internal Mutations =====

export const updateDescriptionInternal = internalMutation({
  args: {
    presentationId: v.id("presentations"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

// ===== Internal Actions =====

export const generateDescriptionAction = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    // Fetch presentation
    const presentation = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.internal.getPresentationInternal,
      { presentationId: args.presentationId },
    )) as {
      title: string;
      currentOutlineVersion?: number;
      userId: Id<"users">;
    } | null;

    if (!presentation) {
      logger.error("Presentation not found for description generation", {
        tag: "Description",
        presentationId: args.presentationId,
      });
      return;
    }

    // Fetch outline items for current version
    const version = presentation.currentOutlineVersion ?? 1;
    const outlineItems = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.outline.getOutlineItemsInternal,
      { presentationId: args.presentationId, version },
    )) as Array<{ title: string; content: string }> | null;

    if (!outlineItems || outlineItems.length === 0) {
      logger.info("No outline items found for description generation", {
        tag: "Description",
        presentationId: args.presentationId,
      });
      return;
    }

    try {
      const model = getModel(DESCRIPTION_MODEL);

      const result = await generateText({
        model,
        system: DESCRIPTION_SYSTEM_PROMPT,
        prompt: buildDescriptionPrompt(
          presentation.title,
          outlineItems.map((item) => ({
            title: item.title,
            content: item.content,
          })),
        ),
        providerOptions: getGatewayOptions(DESCRIPTION_MODEL, undefined, [
          "presentation-description",
        ]),
      });

      // Track usage with feature: "slides"
      if (result.usage) {
        const inputTokens = result.usage.inputTokens ?? 0;
        const outputTokens = result.usage.outputTokens ?? 0;
        const cost = calculateCost(DESCRIPTION_MODEL, {
          inputTokens,
          outputTokens,
        });

        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.usage.mutations.recordTextGeneration,
          {
            userId: presentation.userId,
            presentationId: args.presentationId,
            model: DESCRIPTION_MODEL,
            inputTokens,
            outputTokens,
            cost,
            feature: "slides",
          },
        );
      }

      const description = result.text.trim();

      if (description) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.description.updateDescriptionInternal,
          { presentationId: args.presentationId, description },
        );
      }
    } catch (error) {
      logger.error("Failed to generate description", { error: String(error) });
      // Don't throw - description is optional enhancement
    }
  },
});

// ===== Public Mutations =====

export const regenerateDescription = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);

    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation || presentation.userId !== user._id) {
      throw new Error("Presentation not found");
    }

    // Schedule regeneration
    await ctx.scheduler.runAfter(
      0,
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.presentations.description.generateDescriptionAction,
      { presentationId: args.presentationId },
    );

    return { success: true };
  },
});
