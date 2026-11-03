import { v } from "convex/values";
import { z } from "zod";
import { action } from "../_generated/server";

const RETIRED_FEATURE_ERROR =
  "Smart Assistant task extraction is retired. No transcript data was processed.";

// Zod schema for extracted task - made lenient to avoid validation failures
const TaskSchema = z.object({
  title: z.string().min(1).max(200), // Relaxed min length
  description: z.string().optional().nullable(),
  deadlineText: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional().nullable(),
  confidence: z.number().min(0).max(1.0).optional(), // Made optional with wider range
  context: z.string().optional().nullable(), // Made optional
  timestampSeconds: z.number().optional().nullable(),
});

export type ExtractedTask = z.infer<typeof TaskSchema>;

export const extractTasksFromTranscript = action({
  args: {
    transcript: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (): Promise<ExtractedTask[]> => {
    throw new Error(RETIRED_FEATURE_ERROR);
  },
});
