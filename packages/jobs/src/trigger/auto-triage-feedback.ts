import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { FEEDBACK_TRIAGE_MODEL } from "@blah-chat/ai/operational-models";
import { TRIAGE_PROMPT } from "@blah-chat/ai/prompts/triage";
import { getModel } from "@blah-chat/ai/registry";
import {
  createNeonDatabase,
  feedbackEntries,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const triageSchema = z.object({
  priority: z.enum(["critical", "high", "medium", "low"]),
  suggestedTags: z.array(z.string().min(2).max(30)).max(5),
  summary: z.string().max(100),
  category: z.enum(["ux", "performance", "feature", "bug", "docs", "other"]),
  actionable: z.boolean(),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated"]),
  notes: z.string().max(200).optional(),
});

type TriageOutput = z.infer<typeof triageSchema>;

export interface AutoTriageFeedbackDependencies {
  db?: PersistenceDb;
  now?: () => number;
  generateTriage?: (input: {
    feedbackContext: string;
  }) => Promise<TriageOutput>;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function createDefaultGenerateTriage() {
  return async (input: { feedbackContext: string }): Promise<TriageOutput> => {
    const result = await generateObject({
      model: getModel(FEEDBACK_TRIAGE_MODEL.id),
      schema: triageSchema,
      temperature: 0.3,
      providerOptions: getGatewayOptions(FEEDBACK_TRIAGE_MODEL.id, undefined, [
        "feedback-triage",
      ]),
      prompt: `${TRIAGE_PROMPT}

---
FEEDBACK TO TRIAGE:
${input.feedbackContext}
---

Provide your triage assessment:`,
    });

    return result.object;
  };
}

function buildFeedbackContext(feedback: typeof feedbackEntries.$inferSelect) {
  const parts = [
    `Type: ${feedback.feedbackType}`,
    `Status: ${feedback.status}`,
    `Page: ${feedback.page}`,
    `Description: ${feedback.description}`,
  ];

  if (feedback.whatTheyDid) {
    parts.push(`What they were doing: ${feedback.whatTheyDid}`);
  }
  if (feedback.whatTheySaw) {
    parts.push(`What they saw: ${feedback.whatTheySaw}`);
  }
  if (feedback.whatTheyExpected) {
    parts.push(`What they expected: ${feedback.whatTheyExpected}`);
  }
  if (feedback.userSuggestedUrgency) {
    parts.push(`User-suggested urgency: ${feedback.userSuggestedUrgency}`);
  }

  return parts.join("\n");
}

export async function triageFeedbackEntry(
  payload: { feedbackId: string },
  dependencies: AutoTriageFeedbackDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const generateTriage =
    dependencies.generateTriage ?? createDefaultGenerateTriage();

  const feedback = await db.query.feedbackEntries.findFirst({
    where: eq(feedbackEntries.id, payload.feedbackId),
  });

  if (!feedback) {
    return { success: true, skipped: true, reason: "not_found" as const };
  }

  if (feedback.aiTriage) {
    return { success: true, skipped: true, reason: "already_triaged" as const };
  }

  const triage = await generateTriage({
    feedbackContext: buildFeedbackContext(feedback),
  });

  const notes = [
    `Summary: ${triage.summary}`,
    `Category: ${triage.category}`,
    `Sentiment: ${triage.sentiment}`,
    triage.actionable ? "Actionable: Yes" : "Actionable: No",
    triage.notes ? `Notes: ${triage.notes}` : null,
  ].filter(Boolean);

  const aiTriage = {
    suggestedPriority: triage.priority,
    suggestedTags: triage.suggestedTags,
    triageNotes: notes.join(" | "),
    summary: triage.summary,
    category: triage.category,
    actionable: triage.actionable,
    sentiment: triage.sentiment,
    createdAt: now(),
  };

  await db
    .update(feedbackEntries)
    .set({
      aiTriage,
      updatedAt: now(),
    })
    .where(eq(feedbackEntries.id, feedback.id));

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
}

export const autoTriageFeedbackTask = task({
  id: "auto-triage-feedback",
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: { feedbackId: string }) => {
    return triageFeedbackEntry(payload);
  },
});
