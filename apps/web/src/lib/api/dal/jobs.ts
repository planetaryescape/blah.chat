import "server-only";

// TODO: needs Postgres job orchestration
// All functions below use stub implementations until job system migration is complete.

import { z } from "zod";

type FetchMutation = any;
type FetchQuery = any;

// Stub references - these will be replaced when job system moves to Postgres
const internal: any = {};
const api: any = { jobs: { crud: { getById: null, listRecent: null } } };

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
  userId: string,
  input: z.infer<typeof searchInputSchema>,
) {
  const validated = searchInputSchema.parse(input);

  // Create job
  // @ts-ignore - stub type
  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "search" as const,
    input: validated,
    metadata: {
      conversationId: validated.conversationId
        ? (validated.conversationId as string)
        : undefined,
    },
  })) as string;

  // Schedule execution (non-blocking)
  await convexMutation(internal.jobs.actions.executeSearch as any, {
    jobId,
    query: validated.query,
    conversationId: validated.conversationId
      ? (validated.conversationId as string)
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
  userId: string,
  input: z.infer<typeof extractMemoriesInputSchema>,
) {
  const validated = extractMemoriesInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "extractMemories" as const,
    input: validated,
    metadata: {
      conversationId: validated.conversationId as string,
    },
  })) as string;

  await convexMutation(internal.jobs.actions.executeExtractMemories as any, {
    jobId,
    conversationId: validated.conversationId as string,
  });

  return jobId;
}

/**
 * Create transcription job and schedule execution
 */
export async function createTranscribeJob(
  convexMutation: FetchMutation,
  userId: string,
  input: z.infer<typeof transcribeInputSchema>,
) {
  const validated = transcribeInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "transcribe" as const,
    input: validated,
  })) as string;

  await convexMutation(internal.jobs.actions.executeTranscribe as any, {
    jobId,
    storageId: validated.storageId as string,
    model: validated.model,
  });

  return jobId;
}

/**
 * Create file embeddings job and schedule execution (Tier 2)
 */
export async function createEmbedFileJob(
  convexMutation: FetchMutation,
  userId: string,
  input: z.infer<typeof embedFileInputSchema>,
) {
  const validated = embedFileInputSchema.parse(input);

  const jobId = (await convexMutation(internal.jobs.crud.create as any, {
    userId,
    type: "embedFile" as const,
    input: validated,
    metadata: {
      fileId: validated.fileId as string,
    },
  })) as string;

  await convexMutation(internal.jobs.actions.executeEmbedFile as any, {
    jobId,
    fileId: validated.fileId as string,
  });

  return jobId;
}

/**
 * Get job by ID (verify ownership)
 */
export async function getJobById(convexQuery: FetchQuery, jobId: string) {
  // @ts-ignore - stub type
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
