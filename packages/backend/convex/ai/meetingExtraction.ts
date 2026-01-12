import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  DEADLINE_PARSING_MODEL,
  MEETING_EXTRACTION_MODEL,
} from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { MEETING_EXTRACTION_PROMPT } from "@/lib/prompts/meetingExtraction";
import { DEADLINE_PARSING_PROMPT } from "@/lib/prompts/taskExtraction";
import { action } from "../_generated/server";
import { logger } from "../lib/logger";

// Zod schema for extracted task
const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  deadlineText: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  confidence: z.number().min(0).max(1.0).optional(),
  context: z.string().optional().nullable(),
});

// Zod schema for extracted note
const NoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z
    .enum(["decision", "discussion", "action-item", "insight", "followup"])
    .optional()
    .nullable(),
  confidence: z.number().min(0).max(1.0).optional(),
  context: z.string().optional().nullable(),
});

// Combined extraction result schema
const MeetingExtractionSchema = z.object({
  tasks: z.array(TaskSchema).default([]),
  notes: z.array(NoteSchema).default([]),
});

export type ExtractedTask = z.infer<typeof TaskSchema> & {
  deadline?: number | null;
};
export type ExtractedNote = z.infer<typeof NoteSchema>;
export type MeetingExtractionResult = {
  tasks: ExtractedTask[];
  notes: ExtractedNote[];
};

export const extractFromMeeting = action({
  args: {
    transcript: v.string(),
    meetingDate: v.optional(v.string()),
    sourceId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<MeetingExtractionResult> => {
    try {
      // Single LLM call extracts both tasks and notes
      const result = await generateObject({
        model: getModel(MEETING_EXTRACTION_MODEL.id),
        schema: MeetingExtractionSchema,
        providerOptions: getGatewayOptions(
          MEETING_EXTRACTION_MODEL.id,
          undefined,
          ["meeting-extraction"],
        ),
        prompt: `${MEETING_EXTRACTION_PROMPT}

Transcript:
"""
${args.transcript}
"""

Extract actionable tasks and key meeting notes from the above transcript. Return a JSON object with "tasks" and "notes" arrays. If nothing found, return {"tasks": [], "notes": []}.`,
      });

      // Parse deadlines for each task (using meetingDate as reference)
      const tasksWithParsedDeadlines = await Promise.all(
        result.object.tasks.map(async (task) => {
          if (task.deadlineText) {
            const deadline = await parseDeadline(
              task.deadlineText,
              args.meetingDate,
            );
            return {
              ...task,
              deadline,
            };
          }
          return task;
        }),
      );

      return {
        tasks: tasksWithParsedDeadlines,
        notes: result.object.notes,
      };
    } catch (error) {
      logger.error("Meeting extraction failed", {
        tag: "MeetingExtraction",
        error: String(error),
      });
      return { tasks: [], notes: [] };
    }
  },
});

// Schema for deadline parsing result
const DeadlineSchema = z.object({
  timestamp: z.string().nullable(),
});

async function parseDeadline(
  deadlineText: string,
  meetingDate?: string,
): Promise<number | null> {
  // Use meetingDate as reference point, fallback to now
  const referenceDate = meetingDate ? new Date(meetingDate) : new Date();
  const referenceDateStr = referenceDate.toISOString();

  const prompt = DEADLINE_PARSING_PROMPT.replace(
    "{{CURRENT_DATE}}",
    referenceDateStr,
  );

  try {
    const result = await generateObject({
      model: getModel(DEADLINE_PARSING_MODEL.id),
      schema: DeadlineSchema,
      providerOptions: getGatewayOptions(DEADLINE_PARSING_MODEL.id, undefined, [
        "deadline-parsing",
      ]),
      prompt: `${prompt}

Deadline text: "${deadlineText}"`,
    });

    if (result.object.timestamp) {
      return new Date(result.object.timestamp).getTime();
    }
    return null;
  } catch (error) {
    logger.error("Error parsing deadline", {
      tag: "MeetingExtraction",
      error: String(error),
    });
    return null;
  }
}
