import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const tagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).max(5),
});

// @ts-ignore - Convex + AI SDK type instantiation depth issue
export const extractTags = internalAction({
  args: { noteId: v.id("notes") },
  // @ts-ignore - Convex + AI SDK type inference issue
  handler: async (ctx, { noteId }) => {
    // Get note content
    // @ts-ignore - Convex type instantiation depth issue
    const note = await ctx.runQuery(internal.notes.getInternal, { noteId });
    if (!note) throw new Error("Note not found");

    // Skip if too short
    if (note.content.length < 50) {
      return { suggestedTags: [] };
    }

    try {
      // Truncate to first 1000 chars for cost optimization
      const content = note.content.slice(0, 1000) as string;

      // @ts-ignore - AI SDK type inference issue
      const result = await generateObject({
        model: openrouter("x-ai/grok-4.1-fast"),
        schema: tagSchema,
        temperature: 0.3,
        prompt: `Extract 3-5 concise tags from this note content.

RULES:
- Lowercase only
- 1-2 words max per tag
- Focus on topics, technologies, or key concepts
- Use kebab-case for multi-word tags (e.g., "api-design")
- No generic tags like "help", "code", "general"

Content:
${content}`,
      });

      // Clean and validate tags
      const tags = (result.object.tags as string[])
        .map((tag: string) => tag.toLowerCase().trim())
        .filter((tag: string) => tag.length >= 2 && tag.length <= 30)
        .slice(0, 5);

      // Update note with suggested tags
      // @ts-ignore - Convex type instantiation depth issue
      await ctx.runMutation(internal.notes.tags.updateSuggestedTags, {
        noteId,
        suggestedTags: tags,
      });

      return { suggestedTags: tags };
    } catch (error) {
      console.error("Failed to extract tags:", error);
      return { suggestedTags: [] };
    }
  },
});

export const updateSuggestedTags = internalMutation({
  args: {
    noteId: v.id("notes"),
    suggestedTags: v.array(v.string()),
  },
  handler: async (ctx, { noteId, suggestedTags }) => {
    await ctx.db.patch(noteId, {
      suggestedTags,
      updatedAt: Date.now(),
    });
  },
});
