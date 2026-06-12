import "server-only";

import {
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { z } from "zod";

function getTrigger() {
  const env = parsePersistenceEnv(process.env);
  return createTriggerClient(env);
}

export const extractMemoriesInputSchema = z.object({
  conversationId: z.string(),
});

export const transcribeInputSchema = z.object({
  storageId: z.string(),
  model: z.enum(["whisper-1", "whisper-large-v3"]).optional(),
  mimeType: z.string().optional(),
});

export const embedFileInputSchema = z.object({
  fileId: z.string(),
});

export async function createExtractMemoriesJob(
  userId: string,
  input: z.infer<typeof extractMemoriesInputSchema>,
) {
  const validated = extractMemoriesInputSchema.parse(input);
  const trigger = getTrigger();
  const run = await trigger.triggerTask("extract-memories", {
    conversationId: validated.conversationId,
    userId,
  });
  return run.id ?? "unknown";
}

export async function createTranscribeJob(
  userId: string,
  input: z.infer<typeof transcribeInputSchema>,
) {
  const validated = transcribeInputSchema.parse(input);
  const trigger = getTrigger();
  const run = await trigger.triggerTask("transcribe", {
    userId,
    storageId: validated.storageId,
    model: validated.model,
    mimeType: validated.mimeType,
  });
  return run.id ?? "unknown";
}

export async function createEmbedFileJob(
  _userId: string,
  input: z.infer<typeof embedFileInputSchema>,
) {
  const validated = embedFileInputSchema.parse(input);
  const trigger = getTrigger();
  const run = await trigger.triggerTask("embed-file", {
    fileId: validated.fileId,
  });
  return run.id ?? "unknown";
}

export async function getJobById(jobId: string) {
  const trigger = getTrigger();
  try {
    const run = await trigger.retrieveRun(jobId);
    return {
      _id: jobId,
      status: run.isCompleted
        ? "completed"
        : run.isFailed
          ? "failed"
          : run.isExecuting
            ? "running"
            : "pending",
      result: run.output,
      error: run.error
        ? { message: run.error.message ?? "Unknown error" }
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function listRecentJobs(options?: {
  limit?: number;
  type?: string;
  status?: string;
}) {
  const trigger = getTrigger();
  const result = await trigger.ping();
  return result.data ?? [];
}
