import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { TAG_EXTRACTION_MODEL } from "@/lib/ai/operational-models";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";
import { buildAutoTagPrompt } from "../lib/prompts/operational/tagExtraction";
import { findSimilarTag } from "../tags/matching";

// Smart Manager Phase 2: Task Auto-Tagging

const tagSchema = z.object({
  tags: z.array(z.string().min(2).max(30)).min(1).max(3),
});

/**
 * Auto-tag task with 1-3 tags (reusing notes pattern)
 * Tags are automatically applied based on title + description
 *
 * Matching tiers:
 * 1. Exact slug match (normalize case/whitespace)
 * 2. Fuzzy string match (Levenshtein ≤2 for typos)
 * 3. Semantic similarity (embedding cosine ≥0.85 for synonyms)
 *
 * Performance target: <500ms total
 */
export const extractAndApplyTaskTags = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const startTime = Date.now();

    // Get task
    const task = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getTask,
      { taskId },
    )) as Doc<"tasks"> | null;
    if (!task) throw new Error("Task not found");

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

      // Combine title + description for context
      const content = `${task.title}${task.description ? `\n${task.description}` : ""}`;

      // PHASE 1: LLM Tag Generation
      const llmStart = Date.now();
      const result = await generateObject({
        model: getModel(TAG_EXTRACTION_MODEL.id),
        schema: tagSchema,
        temperature: 0.3,
        providerOptions: getGatewayOptions(TAG_EXTRACTION_MODEL.id, undefined, [
          "task-auto-tagging",
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
          task.userId,
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
          internal.tasks.addTagInternal,
          { taskId, userId: task.userId, tag },
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
        `[TaskAutoTag] ✓ ${finalTags.length} tags | ${totalTime}ms total`,
        `(LLM: ${llmTime}ms, Match: ${matchingTime}ms, Apply: ${applyTime}ms)`,
      );
      console.log(
        `[TaskAutoTag] Matches: exact=${matchStats.exact}, fuzzy=${matchStats.fuzzy}, semantic=${matchStats.semantic}, new=${matchStats.new}`,
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
      console.error("Failed to auto-tag task:", error);
      return { appliedTags: [] };
    }
  },
});

/**
 * Internal helper to add tag to task (dual-write to junction + increment usage)
 */
export const addTagInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.tag.toLowerCase().trim();
    const displayName = args.tag.trim();

    // Find or create tag
    let tagDoc = await ctx.db
      .query("tags")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", args.userId).eq("slug", slug),
      )
      .first();

    if (!tagDoc) {
      // Create new tag
      const tagId = await ctx.db.insert("tags", {
        slug,
        displayName,
        userId: args.userId,
        scope: "user",
        path: `/${slug}`,
        depth: 0,
        usageCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      tagDoc = await ctx.db.get(tagId);
    } else {
      // Increment usage count
      await ctx.db.patch(tagDoc._id, {
        usageCount: tagDoc.usageCount + 1,
        updatedAt: Date.now(),
      });
    }

    if (!tagDoc) throw new Error("Failed to create/find tag");

    // Check if junction already exists
    const existing = await ctx.db
      .query("taskTags")
      .withIndex("by_task_tag", (q) =>
        q.eq("taskId", args.taskId).eq("tagId", tagDoc?._id),
      )
      .first();

    if (!existing) {
      // Create junction
      await ctx.db.insert("taskTags", {
        taskId: args.taskId,
        tagId: tagDoc._id,
        userId: args.userId,
        addedAt: Date.now(),
      });
    }
  },
});
