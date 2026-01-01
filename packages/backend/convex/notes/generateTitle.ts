import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { NOTE_TITLE_PROMPT } from "../lib/prompts/operational/titleGeneration";

/**
 * Generate a concise, descriptive title for a note using AI
 */
export const generateTitle = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { content } = args;

    // Get user for cost tracking
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    )) as { _id: string } | null;

    // Truncate content if too long (first 500 chars should be enough for title generation)
    const truncatedContent = content.slice(0, 500);

    try {
      const result = await generateText({
        model: getModel(TITLE_GENERATION_MODEL.id),
        prompt: `${NOTE_TITLE_PROMPT}

Note content:
${truncatedContent}`,
        temperature: 0.7,
        providerOptions: getGatewayOptions(
          TITLE_GENERATION_MODEL.id,
          undefined,
          ["title-generation"],
        ),
      });

      // Track usage with feature: "notes"
      if (user && result.usage) {
        const inputTokens = result.usage.inputTokens ?? 0;
        const outputTokens = result.usage.outputTokens ?? 0;
        const cost = calculateCost(TITLE_GENERATION_MODEL.id, {
          inputTokens,
          outputTokens,
        });

        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.usage.mutations.recordTextGeneration,
          {
            userId: user._id,
            model: TITLE_GENERATION_MODEL.id,
            inputTokens,
            outputTokens,
            cost,
            feature: "notes",
          },
        );
      }

      // Clean up any markdown, quotes, or extra formatting
      const title = result.text
        .trim()
        .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
        .replace(/^#+\s*/, "") // Remove markdown heading syntax
        .replace(/\*\*/g, ""); // Remove bold markdown

      return { title };
    } catch (error) {
      console.error("Failed to generate note title:", error);
      throw new Error("Failed to generate title");
    }
  },
});
