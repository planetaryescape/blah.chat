import "server-only";
import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { MEETING_EXTRACTION_MODEL } from "@blah-chat/ai/operational-models";
import { MEETING_EXTRACTION_PROMPT } from "@blah-chat/ai/prompts/meetingExtraction";
import { getModel } from "@blah-chat/ai/registry";
import { calculateCost } from "@blah-chat/ai/utils";
import { usageRecords } from "@blah-chat/persistence-postgres";
import { generateObject } from "ai";
import { z } from "zod";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

const extractMeetingSchema = z.object({
  transcript: z.string().min(1).max(100_000),
  meetingDate: z.string().optional(),
  conversationId: z.string().optional(),
});

const extractedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  deadlineText: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  context: z.string().optional().nullable(),
});

const extractedNoteSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  context: z.string().optional().nullable(),
});

const meetingExtractionOutputSchema = z.object({
  tasks: z.array(extractedTaskSchema),
  notes: z.array(extractedNoteSchema),
});

function currentUsageDate() {
  return new Date().toISOString().split("T")[0] ?? new Date().toISOString();
}

export const meetingExtractionDAL = {
  async extract(clerkUserId: string, payload: unknown) {
    const { transcript, meetingDate, conversationId } =
      extractMeetingSchema.parse(payload);
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    const userPrompt = meetingDate
      ? `Meeting date: ${meetingDate}\n\nTranscript:\n${transcript}`
      : `Transcript:\n${transcript}`;

    const result = await generateObject({
      model: getModel(MEETING_EXTRACTION_MODEL.id),
      schema: meetingExtractionOutputSchema,
      temperature: 0.3,
      system: MEETING_EXTRACTION_PROMPT,
      prompt: userPrompt,
      providerOptions: getGatewayOptions(MEETING_EXTRACTION_MODEL.id, user.id, [
        "meeting-extraction",
      ]),
    });

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    try {
      await getPersistenceDb()
        .insert(usageRecords)
        .values({
          userId: user.id,
          date: currentUsageDate(),
          model: MEETING_EXTRACTION_MODEL.id,
          conversationId: conversationId ?? null,
          feature: "smart_assistant",
          operationType: "text",
          inputTokens,
          outputTokens,
          cost: calculateCost(MEETING_EXTRACTION_MODEL.id, {
            inputTokens,
            outputTokens,
          }),
          messageCount: 1,
        });
    } catch (error) {
      console.warn("meeting extraction usage record failed", error);
    }

    return formatEntity(
      {
        tasks: result.object.tasks,
        notes: result.object.notes,
        modelId: MEETING_EXTRACTION_MODEL.id,
        usage: result.usage,
      },
      "meeting_extraction",
      conversationId ?? `meeting-${Date.now()}`,
    );
  },
};
