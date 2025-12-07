import { v } from "convex/values";
import { action } from "../_generated/server";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

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
        model: openrouter("x-ai/grok-4.1-fast"),
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates concise, descriptive titles for notes. Generate a title that captures the main topic or purpose of the note in 3-8 words. Return ONLY the title text, nothing else.",
          },
          {
            role: "user",
            content: `Generate a title for this note:\n\n${truncatedContent}`,
          },
        ],
        temperature: 0.7,
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
