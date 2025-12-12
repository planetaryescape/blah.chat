import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TAG_EXTRACTION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { buildAutoTagPrompt } from "../lib/prompts/operational/tagExtraction";
import { findSimilarTag } from "../tags/matching";

const tagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).min(1).max(3),
});

/**
 * Auto-tag note with 1-3 tags (Phase 3: Optimized with performance monitoring)
 * Tags are automatically applied (not stored as suggestions)
 *
 * Matching tiers:
 * 1. Exact slug match (normalize case/whitespace)
 * 2. Fuzzy string match (Levenshtein ≤2 for typos)
 * 3. Semantic similarity (embedding cosine ≥0.85 for synonyms)
 *
 * Performance target: <500ms total
 */
export const extractAndApplyTags = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const startTime = Date.now();

    // Get note content
    const note = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getNote,
      { noteId },
    )) as Doc<"notes"> | null;
    if (!note) throw new Error("Note not found");

    // Skip if too short
    if (note.content.length < 50) {
      return { appliedTags: [] };
    }

    try {
      // Get user's existing tags (top 20 by usage)
      const existingTags = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.tags.queries.getAllUserTags,
        {},
      )) as Doc<"tags">[];

      const popularTags = existingTags
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 20)
        .map((t) => ({ displayName: t.displayName, usageCount: t.usageCount }));

      // Truncate to first 1000 chars for cost optimization
      const content = note.content.slice(0, 1000) as string;

      // PHASE 1: LLM Tag Generation
      const llmStart = Date.now();
      const result = await generateObject({
        model: getModel(TAG_EXTRACTION_MODEL.id),
        schema: tagSchema,
        temperature: 0.3,
        providerOptions: getGatewayOptions(TAG_EXTRACTION_MODEL.id, undefined, [
          "auto-tagging",
        ]),
        prompt: buildAutoTagPrompt(content, popularTags),
      });
      const llmTime = Date.now() - llmStart;

      // PHASE 2: Three-tier semantic deduplication
      const matchingStart = Date.now();
      const embeddingCache = new Map<string, number[]>();
      const finalTags: string[] = [];
      const matchStats = { exact: 0, fuzzy: 0, semantic: 0, new: 0 };

      for (const candidateTag of result.object.tags) {
        if (finalTags.length >= 3) break;

        // Find similar tag using three-tier matching
        const match = await findSimilarTag(
          ctx,
          candidateTag,
          note.userId,
          existingTags,
          embeddingCache,
        );

        if (match.matchType !== "none" && match.existingTag) {
          // Reuse existing tag (preserve display name)
          const tagName = match.existingTag.displayName;
          if (!finalTags.includes(tagName)) {
            finalTags.push(tagName);
            matchStats[match.matchType]++;
          }
        } else {
          // Create new tag
          const newTag = candidateTag.toLowerCase().trim();
          if (!finalTags.includes(newTag)) {
            finalTags.push(newTag);
            matchStats.new++;
          }
        }
      }
      const matchingTime = Date.now() - matchingStart;

      // PHASE 3: Tag Application (dual-write)
      const applyStart = Date.now();
      for (const tag of finalTags) {
        (await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.notes.addTagInternal,
          { noteId, userId: note.userId, tag },
        )) as Promise<void>;
      }
      const applyTime = Date.now() - applyStart;

      const totalTime = Date.now() - startTime;
      const tagReuseRate =
        finalTags.length > 0
          ? ((matchStats.exact + matchStats.fuzzy + matchStats.semantic) /
              finalTags.length) *
            100
          : 0;

      console.log(
        `[AutoTag] ✓ ${finalTags.length} tags | ${totalTime}ms total`,
        `(LLM: ${llmTime}ms, Match: ${matchingTime}ms, Apply: ${applyTime}ms)`,
      );
      console.log(
        `[AutoTag] Matches: exact=${matchStats.exact}, fuzzy=${matchStats.fuzzy}, semantic=${matchStats.semantic}, new=${matchStats.new}`,
        `| Reuse rate: ${tagReuseRate.toFixed(0)}%`,
      );

      return {
        appliedTags: finalTags,
        matchStats,
        performance: {
          totalTime,
          llmTime,
          matchingTime,
          applyTime,
          tagReuseRate,
        },
      };
    } catch (error) {
      console.error("Failed to auto-tag note:", error);
      return { appliedTags: [] };
    }
  },
});
