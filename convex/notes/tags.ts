import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TAG_EXTRACTION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { buildTagExtractionPrompt } from "../lib/prompts/operational/tagExtraction";

const tagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).max(5),
});

export const extractTags = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    // Get note content
    const note = await (ctx.runQuery as (
      ref: any,
      args: any,
    ) => Promise<Doc<"notes"> | null>)(
      internal.lib.helpers.getNote as any,
      { noteId },
    );
    if (!note) throw new Error("Note not found");

    // Skip if too short
    if (note.content.length < 50) {
      return { suggestedTags: [] };
    }

    try {
      // Truncate to first 1000 chars for cost optimization
      const content = note.content.slice(0, 1000) as string;

      const result = await generateObject({
        model: getModel(TAG_EXTRACTION_MODEL.id),
        schema: tagSchema,
        temperature: 0.3,
        providerOptions: getGatewayOptions(TAG_EXTRACTION_MODEL.id, undefined, [
          "tag-extraction",
        ]),
        prompt: buildTagExtractionPrompt(content),
      });

      // Clean and validate tags
      const tags = (result.object.tags as string[])
        .map((tag: string) => tag.toLowerCase().trim())
        .filter((tag: string) => tag.length >= 2 && tag.length <= 30)
        .slice(0, 5);

      // Update note with suggested tags
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
