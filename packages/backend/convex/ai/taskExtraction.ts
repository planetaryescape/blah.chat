import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "@/lib/ai/gateway";
import {
  DEADLINE_PARSING_MODEL,
  TASK_EXTRACTION_MODEL,
} from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import {
  DEADLINE_PARSING_PROMPT,
  TASK_EXTRACTION_PROMPT,
} from "@/lib/prompts/taskExtraction";
import { action } from "../_generated/server";
import { logger } from "../lib/logger";

// Smart Manager Phase 2: Task Extraction from Transcripts

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

// Zod schema for extraction result
const TaskExtractionSchema = z.object({
  tasks: z.array(TaskSchema).default([]),
});

export type ExtractedTask = z.infer<typeof TaskSchema>;

export const extractTasksFromTranscript = action({
  args: {
    transcript: v.string(),
    sourceId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<ExtractedTask[]> => {
    try {
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

Extract actionable tasks from the above transcript. Return a JSON object with a "tasks" array. If no tasks are found, return {"tasks": []}.`,
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
    } catch (error) {
      logger.error("Task extraction failed", {
        tag: "TaskExtraction",
        error: String(error),
      });
      // Return empty array on failure rather than throwing
      return [];
    }
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
      tag: "TaskExtraction",
      error: String(error),
    });
    return null;
  }
}
