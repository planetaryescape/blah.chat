import "server-only";

import type { fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api, internal } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type FetchMutation = typeof fetchMutation;
type FetchQuery = typeof fetchQuery;

// Validation schemas for each job type
export const searchInputSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  dateFrom: z.number().optional(),
  dateTo: z.number().optional(),
  messageType: z.enum(["user", "assistant"]).optional(),
});

export const extractMemoriesInputSchema = z.object({
  conversationId: z.string(),
});

export const transcribeInputSchema = z.object({
  storageId: z.string(),
  model: z.enum(["whisper-1", "whisper-large-v3"]).optional(),
});

export const embedFileInputSchema = z.object({
  fileId: z.string(),
});

/**
 * Create search job and schedule execution
 */
export async function createSearchJob(
  convexMutation: FetchMutation,
  userId: Id<"users">,
  input: z.infer<typeof searchInputSchema>,
) {
  const validated = searchInputSchema.parse(input);

  // Create job
  // @ts-ignore - Type depth exceeded with Convex internal functions
  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "search" as const,
    input: validated,
    metadata: {
      conversationId: validated.conversationId
        ? (validated.conversationId as Id<"conversations">)
        : undefined,
    },
  })) as Id<"jobs">;

  // Schedule execution (non-blocking)
  await convexMutation(internal.jobs.actions.executeSearch as any, {
    jobId,
    query: validated.query,
    conversationId: validated.conversationId
      ? (validated.conversationId as Id<"conversations">)
      : undefined,
    limit: validated.limit,
    dateFrom: validated.dateFrom,
    dateTo: validated.dateTo,
    messageType: validated.messageType as "user" | "assistant" | undefined,
  });

  return jobId;
}

/**
 * Create memory extraction job and schedule execution
 */
export async function createExtractMemoriesJob(
  convexMutation: FetchMutation,
  userId: Id<"users">,
  input: z.infer<typeof extractMemoriesInputSchema>,
) {
  const validated = extractMemoriesInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "extractMemories" as const,
    input: validated,
    metadata: {
      conversationId: validated.conversationId as Id<"conversations">,
    },
  })) as Id<"jobs">;

  await convexMutation(internal.jobs.actions.executeExtractMemories as any, {
    jobId,
    conversationId: validated.conversationId as Id<"conversations">,
  });

  return jobId;
}

/**
 * Create transcription job and schedule execution
 */
export async function createTranscribeJob(
  convexMutation: FetchMutation,
  userId: Id<"users">,
  input: z.infer<typeof transcribeInputSchema>,
) {
  const validated = transcribeInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "transcribe" as const,
    input: validated,
  })) as Id<"jobs">;

  await convexMutation(internal.jobs.actions.executeTranscribe as any, {
    jobId,
    storageId: validated.storageId as Id<"_storage">,
    model: validated.model,
  });

  return jobId;
}

/**
 * Create file embeddings job and schedule execution (Tier 2)
 */
export async function createEmbedFileJob(
  convexMutation: FetchMutation,
  userId: Id<"users">,
  input: z.infer<typeof embedFileInputSchema>,
) {
  const validated = embedFileInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "embedFile" as const,
    input: validated,
    metadata: {
      fileId: validated.fileId as Id<"files">,
    },
  })) as Id<"jobs">;

  await convexMutation(internal.jobs.actions.executeEmbedFile as any, {
    jobId,
    fileId: validated.fileId as Id<"files">,
  });

  return jobId;
}

/**
 * Get job by ID (verify ownership)
 */
export async function getJobById(convexQuery: FetchQuery, jobId: Id<"jobs">) {
  // @ts-ignore - Type depth exceeded with Convex query
  return convexQuery(api.jobs.crud.getById, { id: jobId });
}

/**
 * List recent jobs
 */
export async function listRecentJobs(
  convexQuery: FetchQuery,
  options?: { limit?: number; type?: string; status?: string },
) {
  return convexQuery(api.jobs.crud.listRecent, {
    limit: options?.limit,
    type: options?.type as any,
    status: options?.status as any,
  });
}
