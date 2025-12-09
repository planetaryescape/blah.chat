import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { FEEDBACK_TRIAGE_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

// ============================================================================
// TRIAGE SCHEMA
// ============================================================================

const triageSchema = z.object({
  priority: z
    .enum(["critical", "high", "medium", "low"])
    .describe(
      "Urgency level based on impact, user frustration, and business importance",
    ),
  suggestedTags: z
    .array(z.string().min(2).max(30))
    .max(5)
    .describe("Relevant categorical tags for this feedback"),
  summary: z
    .string()
    .max(100)
    .describe("A brief one-line summary of the feedback"),
  category: z
    .enum(["ux", "performance", "feature", "bug", "docs", "other"])
    .describe("Technical category of the feedback"),
  actionable: z
    .boolean()
    .describe("Whether this feedback contains specific, actionable items"),
  sentiment: z
    .enum(["positive", "neutral", "negative", "frustrated"])
    .describe("Overall emotional tone of the feedback"),
  notes: z
    .string()
    .max(200)
    .optional()
    .describe("Any additional context or recommendations for the team"),
});

import { getModel } from "@/lib/ai/registry";
import { TRIAGE_PROMPT } from "../../src/lib/prompts/triage";

// ============================================================================
// AUTO-TRIAGE ACTION
// ============================================================================

export const autoTriageFeedback = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    // Get feedback content
    // @ts-ignore - Convex query type instantiation depth issue
    const feedback = await ctx.runQuery(internal.feedback.getFeedbackInternal, {
      feedbackId,
    });

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Skip if already triaged
    if (feedback.aiTriage) {
      return { success: true, skipped: true, reason: "Already triaged" };
    }

    try {
      // Build context string from feedback
      const contextParts: string[] = [
        `Type: ${feedback.feedbackType || "general"}`,
        `Status: ${feedback.status}`,
        `Page: ${feedback.page}`,
        `Description: ${feedback.description}`,
      ];

      if (feedback.whatTheyDid) {
        contextParts.push(`What they were doing: ${feedback.whatTheyDid}`);
      }
      if (feedback.whatTheySaw) {
        contextParts.push(`What they saw: ${feedback.whatTheySaw}`);
      }
      if (feedback.whatTheyExpected) {
        contextParts.push(`What they expected: ${feedback.whatTheyExpected}`);
      }
      if (feedback.userSuggestedUrgency) {
        contextParts.push(
          `User-suggested urgency: ${feedback.userSuggestedUrgency}`,
        );
      }

      const feedbackContext = contextParts.join("\n");

      // Generate triage using centralized model config
      const result = await generateObject({
        model: getModel(FEEDBACK_TRIAGE_MODEL.id),
        schema: triageSchema,
        temperature: 0.3,
        providerOptions: getGatewayOptions(
          FEEDBACK_TRIAGE_MODEL.id,
          undefined,
          ["feedback-triage"],
        ),
        prompt: `${TRIAGE_PROMPT}

---
FEEDBACK TO TRIAGE:
${feedbackContext}
---

Provide your triage assessment:`,
      });

      const triage = result.object;

      // Store the AI triage result
      // Build notes string from multiple AI outputs
      const notesArray = [
        `Summary: ${triage.summary}`,
        `Category: ${triage.category}`,
        `Sentiment: ${triage.sentiment}`,
        triage.actionable ? "Actionable: Yes" : "Actionable: No",
        triage.notes ? `Notes: ${triage.notes}` : null,
      ].filter(Boolean);

      await ctx.runMutation(internal.feedback.triage.updateAiTriage, {
        feedbackId,
        aiTriage: {
          suggestedPriority: triage.priority,
          suggestedTags: triage.suggestedTags,
          triageNotes: notesArray.join(" | "),
          createdAt: Date.now(),
        },
      });

      return {
        success: true,
        triage: {
          priority: triage.priority,
          tags: triage.suggestedTags,
          summary: triage.summary,
          category: triage.category,
          actionable: triage.actionable,
          sentiment: triage.sentiment,
        },
      };
    } catch (error) {
      console.error("Auto-triage failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const updateAiTriage = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    aiTriage: v.object({
      suggestedPriority: v.string(),
      suggestedTags: v.array(v.string()),
      possibleDuplicateId: v.optional(v.id("feedback")),
      triageNotes: v.string(),
      createdAt: v.number(),
    }),
  },
  handler: async (ctx, { feedbackId, aiTriage }) => {
    await ctx.db.patch(feedbackId, {
      aiTriage,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// ACCEPT TRIAGE SUGGESTION
// ============================================================================

export const acceptTriageSuggestion = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    acceptPriority: v.optional(v.boolean()),
    acceptTags: v.optional(v.boolean()),
  },
  handler: async (ctx, { feedbackId, acceptPriority, acceptTags }) => {
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback?.aiTriage) {
      throw new Error("No AI triage available");
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (acceptPriority && feedback.aiTriage.suggestedPriority) {
      updates.priority = feedback.aiTriage.suggestedPriority;
    }

    if (acceptTags && feedback.aiTriage.suggestedTags) {
      // Merge with existing tags
      const existingTags = feedback.tags || [];
      const newTags = [
        ...new Set([...existingTags, ...feedback.aiTriage.suggestedTags]),
      ];
      updates.tags = newTags;
    }

    await ctx.db.patch(feedbackId, updates);
  },
});
