import { getModel } from "@/lib/ai/registry";
import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TITLE_GENERATION_MODEL } from "../../src/lib/ai/operational-models";
import { action } from "../_generated/server";
import { NOTE_TITLE_PROMPT } from "../lib/prompts/operational/titleGeneration";

/**
 * Generate a concise, descriptive title for a note using AI
 */
export const generateTitle = action({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, args) => {
    const { content } = args;

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
