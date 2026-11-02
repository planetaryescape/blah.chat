"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

/**
 * Generic wrapper pattern for job actions
 * Handles status updates and error handling
 */
async function executeJobAction<TInput, TOutput>(
  ctx: any,
  jobId: Id<"jobs">,
  actionFn: (input: TInput) => Promise<TOutput>,
  input: TInput,
): Promise<TOutput> {
  try {
    // Mark as running
    (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.jobs.crud.updateStatus,
      { jobId, status: "running" as const },
    )) as Promise<void>;

    // Execute actual action
    const result = await actionFn(input);

    // Mark as completed
    (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.jobs.crud.updateStatus,
      { jobId, status: "completed" as const, result },
    )) as Promise<void>;

    return result;
  } catch (error) {
    // Mark as failed
    (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit
      internal.jobs.crud.updateStatus,
      {
        jobId,
        status: "failed" as const,
        error: {
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? { stack: error.stack } : undefined,
        },
      },
    )) as Promise<void>;

    throw error;
  }
}

/**
 * Hybrid search wrapper
 * Reuses existing search.hybrid.hybridSearch action
 */
export const executeSearch = internalAction({
  args: {
    jobId: v.id("jobs"),
    query: v.string(),
    conversationId: v.optional(v.id("conversations")),
    limit: v.optional(v.number()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    messageType: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
  },
  handler: async (
    ctx,
    { jobId, query, conversationId, limit, dateFrom, dateTo, messageType },
  ): Promise<Doc<"messages">[]> => {
    return executeJobAction(
      ctx,
      jobId,
      async (): Promise<Doc<"messages">[]> => {
        return (await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.search.hybrid.hybridSearch,
          { query, conversationId, limit, dateFrom, dateTo, messageType },
        )) as Doc<"messages">[];
      },
      { query, conversationId, limit, dateFrom, dateTo, messageType },
    );
  },
});

/**
 * Memory extraction wrapper
 * Reuses existing ai.extractMemories action
 */
export const executeExtractMemories = internalAction({
  args: {
    jobId: v.id("jobs"),
    conversationId: v.id("conversations"),
  },
  handler: async (
    ctx,
    { jobId, conversationId },
  ): Promise<{ memories: any[] }> => {
    return executeJobAction(
      ctx,
      jobId,
      async (): Promise<{ memories: any[] }> => {
        return (await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.ai.extractMemories.extractMemoriesFromConversation,
          { conversationId },
        )) as { memories: any[] };
      },
      { conversationId },
    );
  },
});

/**
 * Transcription wrapper
 * Reuses existing transcription.transcribeAudio action
 */
export const executeTranscribe = internalAction({
  args: {
    jobId: v.id("jobs"),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { jobId, storageId, mimeType },
  ): Promise<{ text: string }> => {
    return executeJobAction(
      ctx,
      jobId,
      async (): Promise<{ text: string }> => {
        const text = (await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.transcription.transcribeAudioInternal,
          { storageId, mimeType: mimeType ?? "audio/webm" },
        )) as string;
        return { text };
      },
      { storageId, mimeType },
    );
  },
});

/**
 * File embeddings wrapper (Tier 2)
 * Reuses existing files.embeddings action
 */
export const executeEmbedFile = internalAction({
  args: {
    jobId: v.id("jobs"),
    fileId: v.id("files"),
  },
  handler: async (
    ctx,
    { jobId, fileId },
  ): Promise<{ success: boolean; chunks: number }> => {
    return executeJobAction(
      ctx,
      jobId,
      async (): Promise<{ success: boolean; chunks: number }> => {
        return (await (ctx.runAction as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.files.embeddings.generateFileEmbeddings,
          { fileId },
        )) as { success: boolean; chunks: number };
      },
      { fileId },
    );
  },
});
