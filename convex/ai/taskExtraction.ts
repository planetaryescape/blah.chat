import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  DEADLINE_PARSING_MODEL,
  TASK_EXTRACTION_MODEL,
} from "@/lib/ai/operational-models";
import {
  DEADLINE_PARSING_PROMPT,
  TASK_EXTRACTION_PROMPT,
} from "@/lib/prompts/taskExtraction";
import { action } from "../_generated/server";

// Smart Manager Phase 2: Task Extraction from Transcripts

// Zod schema for extracted task
const TaskSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().optional(),
  deadlineText: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  confidence: z.number().min(0.5).max(1.0),
  context: z.string(),
  timestampSeconds: z.number().optional(),
});

// Zod schema for extraction result
const TaskExtractionSchema = z.object({
  tasks: z.array(TaskSchema).min(0).max(20),
});

export type ExtractedTask = z.infer<typeof TaskSchema>;

export const extractTasksFromTranscript = action({
  args: {
    transcript: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ExtractedTask[]> => {
    // Use LLM to extract tasks from transcript
    const result = await generateObject({
      model: getModel(TASK_EXTRACTION_MODEL.id),
      schema: TaskExtractionSchema,
      providerOptions: getGatewayOptions(
        TASK_EXTRACTION_MODEL.id,
        undefined,
        ["task-extraction"],
      ),
      prompt: `${TASK_EXTRACTION_PROMPT}

Transcript:
"""
${args.transcript}
"""

Extract actionable tasks from the above transcript. Return a JSON object with a "tasks" array.`,
    });

    // Parse deadlines for each task
    const tasksWithParsedDeadlines = await Promise.all(
      result.object.tasks.map(async (task) => {
        if (task.deadlineText) {
          const deadline = await parseDeadline(task.deadlineText);
          return {
            ...task,
            deadline,
          };
        }
        return task;
      }),
    );

    return tasksWithParsedDeadlines;
  },
});

// Schema for deadline parsing result
const DeadlineSchema = z.object({
  timestamp: z.string().nullable(),
});

async function parseDeadline(deadlineText: string): Promise<number | null> {
  const now = new Date();
  const currentDateStr = now.toISOString();

  const prompt = DEADLINE_PARSING_PROMPT.replace(
    "{{CURRENT_DATE}}",
    currentDateStr,
  );

  try {
    const result = await generateObject({
      model: getModel(DEADLINE_PARSING_MODEL.id),
      schema: DeadlineSchema,
      providerOptions: getGatewayOptions(
        DEADLINE_PARSING_MODEL.id,
        undefined,
        ["deadline-parsing"],
      ),
      prompt: `${prompt}

Deadline text: "${deadlineText}"`,
    });

    if (result.object.timestamp) {
      return new Date(result.object.timestamp).getTime();
    }
    return null;
  } catch (error) {
    console.error("Error parsing deadline:", error);
    return null;
  }
}
