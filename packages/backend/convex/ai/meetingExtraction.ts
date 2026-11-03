import { v } from "convex/values";
import { z } from "zod";
import { action } from "../_generated/server";

const RETIRED_FEATURE_ERROR =
  "Smart Assistant meeting extraction is retired. No transcript data was processed.";

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
  handler: async (): Promise<MeetingExtractionResult> => {
    throw new Error(RETIRED_FEATURE_ERROR);
  },
});
