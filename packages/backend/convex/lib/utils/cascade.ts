import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  isAudioCacheBlobReferenced,
  listOwnedAudioCache,
} from "../../ttsCache";

/**
 * Cascade delete all related records for a conversation.
 * Handles: bookmarks, shares, files (nullify), memories (nullify),
 * project junctions, participants, tokenUsage, attachments, toolCalls,
 * sources, canvasDocuments, canvasHistory, messages, and the conversation itself.
 */
export async function cascadeDeleteConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  options?: { deleteMessages?: boolean; deleteConversation?: boolean },
): Promise<void> {
  const deleteMessages = options?.deleteMessages ?? true;
  const deleteConversation = options?.deleteConversation ?? true;

  // Parallel queries for all related records
  const [
    bookmarks,
    shares,
    files,
    memories,
    junctions,
    participants,
    tokenUsage,
    attachments,
    toolCalls,
    sources,
    canvasDocs,
    integrationSelections,
    settlementRuns,
  ] = await Promise.all([
    ctx.db
      .query("bookmarks")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("shares")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("files")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("memories")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect(),
    ctx.db
      .query("projectConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("conversationTokenUsage")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("attachments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("toolCalls")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("sources")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("canvasDocuments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("conversationIntegrations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
    ctx.db
      .query("agentRuns")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect(),
  ]);

  // Parallel deletions for independent tables
  await Promise.all([
    ...bookmarks.map((b) => ctx.db.delete(b._id)),
    ...shares.map((s) => ctx.db.delete(s._id)),
    ...junctions.map((j) => ctx.db.delete(j._id)),
    ...participants.map((p) => ctx.db.delete(p._id)),
    ...tokenUsage.map((t) => ctx.db.delete(t._id)),
    ...attachments.map((a) => ctx.db.delete(a._id)),
    ...toolCalls.map((tc) => ctx.db.delete(tc._id)),
    ...sources.map((src) => ctx.db.delete(src._id)),
    ...integrationSelections.map((selection) => ctx.db.delete(selection._id)),
  ]);

  // Nullify files/memories (can exist independently)
  await Promise.all([
    ...files.map((f) => ctx.db.patch(f._id, { conversationId: undefined })),
    ...memories.map((m) => ctx.db.patch(m._id, { conversationId: undefined })),
  ]);

  // Financial evidence outlives transcript deletion, but loses all links back
  // to the deleted conversation and message. Owner erasure removes it below.
  for (const run of settlementRuns) {
    await ctx.db.patch(run._id, {
      conversationId: undefined,
      messageId: undefined,
    });
    const [events, projections] = await Promise.all([
      ctx.db
        .query("usageEvents")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect(),
      ctx.db
        .query("chatUsageProjections")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect(),
    ]);
    await Promise.all([
      ...events.map((event) =>
        ctx.db.patch(event._id, { conversationId: undefined }),
      ),
      ...projections.map((projection) =>
        ctx.db.patch(projection._id, { conversationId: undefined }),
      ),
    ]);
    for (const projection of projections) {
      if (!projection.usageRecordId) continue;
      const record = await ctx.db.get(projection.usageRecordId);
      if (
        record?.userId === run.ownerUserId &&
        record.conversationId === conversationId
      ) {
        await ctx.db.patch(record._id, { conversationId: undefined });
      }
    }
  }

  // Canvas docs have history children - must delete history first
  for (const doc of canvasDocs) {
    const history = await ctx.db
      .query("canvasHistory")
      .withIndex("by_document", (q) => q.eq("documentId", doc._id))
      .collect();
    await Promise.all(history.map((h) => ctx.db.delete(h._id)));
    await ctx.db.delete(doc._id);
  }

  if (deleteMessages) {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));
  }

  if (deleteConversation) await ctx.db.delete(conversationId);
}

/**
 * Cascade delete all user data (keeps account).
 * Used for GDPR "delete my data" requests.
 */
export async function cascadeDeleteUserData(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  // Remove children of owned conversations before deleting their parent rows.
  // Membership in someone else's conversation never authorizes deleting it.
  const ownedAudio = await listOwnedAudioCache(ctx, userId);
  const ownedBlobs = new Set<Id<"_storage">>(
    ownedAudio.map((row) => row.storageId),
  );
  for (const row of await ctx.db
    .query("files")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect())
    ownedBlobs.add(row.storageId);
  for (const row of ownedAudio) await ctx.db.delete(row._id);
  for (const row of await ctx.db
    .query("attachments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect())
    ownedBlobs.add(row.storageId);
  const ownedConversations = await ctx.db
    .query("conversations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const conversation of ownedConversations) {
    await cascadeDeleteConversation(ctx, conversation._id);
  }

  const extraTables = [
    "routingFeedback",
    "speechPreparationSessions",
    "ttsSynthesisClaims",
    "conversationIntegrations",
    "rateLimitEvents",
    "jobs",
    "activityEvents",
    "chatSuggestionsCache",
    "feedbackTagJunctions",
    "generationLocks",
    "composioConnections",
    "templates",
  ] as const;
  const sendReceipts = await ctx.db
    .query("chatSendReceipts")
    .withIndex("by_user", (q) => q.eq("ownerId", userId))
    .collect();
  for (const receipt of sendReceipts) await ctx.db.delete(receipt._id);

  for (const table of extraTables) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }

  // Phase 1: Delete junction tables (many-to-many relationships)
  const [
    bookmarkTags,
    snippetTags,
    noteTags,
    taskTags,
    projectConversations,
    projectNotes,
    projectFiles,
  ] = await Promise.all([
    ctx.db
      .query("bookmarkTags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("snippetTags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("noteTags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("taskTags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("projectConversations")
      .filter((q) => q.eq(q.field("addedBy"), userId))
      .collect(),
    ctx.db
      .query("projectNotes")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
    ctx.db
      .query("projectFiles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
  ]);

  await Promise.all([
    ...bookmarkTags.map((r) => ctx.db.delete(r._id)),
    ...snippetTags.map((r) => ctx.db.delete(r._id)),
    ...noteTags.map((r) => ctx.db.delete(r._id)),
    ...taskTags.map((r) => ctx.db.delete(r._id)),
    ...projectConversations.map((r) => ctx.db.delete(r._id)),
    ...projectNotes.map((r) => ctx.db.delete(r._id)),
    ...projectFiles.map((r) => ctx.db.delete(r._id)),
  ]);

  // Phase 2: Delete child records (have FKs to parents that will be deleted later)
  const [
    toolCalls,
    sources,
    attachments,
    votes,
    canvasHistory,
    knowledgeChunks,
    fileChunks,
  ] = await Promise.all([
    ctx.db
      .query("toolCalls")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("sources")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("attachments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("canvasHistory")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
    ctx.db
      .query("knowledgeChunks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("fileChunks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  ]);

  await Promise.all([
    ...toolCalls.map((r) => ctx.db.delete(r._id)),
    ...sources.map((r) => ctx.db.delete(r._id)),
    ...attachments.map((r) => ctx.db.delete(r._id)),
    ...votes.map((r) => ctx.db.delete(r._id)),
    ...canvasHistory.map((r) => ctx.db.delete(r._id)),
    ...knowledgeChunks.map((r) => ctx.db.delete(r._id)),
    ...fileChunks.map((r) => ctx.db.delete(r._id)),
  ]);

  // Phase 3: Delete parent records (messages, canvasDocuments, knowledgeSources)
  const [messages, canvasDocuments, knowledgeSources] = await Promise.all([
    ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("canvasDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("knowledgeSources")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  ]);

  await Promise.all([
    ...messages.map((r) => ctx.db.delete(r._id)),
    ...canvasDocuments.map((r) => ctx.db.delete(r._id)),
    ...knowledgeSources.map((r) => ctx.db.delete(r._id)),
  ]);

  // Phase 4: Delete main content entities
  const [
    conversations,
    bookmarks,
    snippets,
    notes,
    tasks,
    projects,
    memories,
    files,
    tags,
    scheduledPrompts,
    shares,
    notifications,
    feedback,
    conversationParticipants,
  ] = await Promise.all([
    ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("snippets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("memories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("tags")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
    ctx.db
      .query("scheduledPrompts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("shares")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  ]);

  await Promise.all([
    ...conversations.map((r) => ctx.db.delete(r._id)),
    ...bookmarks.map((r) => ctx.db.delete(r._id)),
    ...snippets.map((r) => ctx.db.delete(r._id)),
    ...notes.map((r) => ctx.db.delete(r._id)),
    ...tasks.map((r) => ctx.db.delete(r._id)),
    ...projects.map((r) => ctx.db.delete(r._id)),
    ...memories.map((r) => ctx.db.delete(r._id)),
    ...files.map((r) => ctx.db.delete(r._id)),
    ...tags.map((r) => ctx.db.delete(r._id)),
    ...scheduledPrompts.map((r) => ctx.db.delete(r._id)),
    ...shares.map((r) => ctx.db.delete(r._id)),
    ...notifications.map((r) => ctx.db.delete(r._id)),
    ...feedback.map((r) => ctx.db.delete(r._id)),
    ...conversationParticipants.map((r) => ctx.db.delete(r._id)),
  ]);

  // Phase 5: Delete user config/metadata
  const [
    userPreferences,
    userOnboarding,
    userStats,
    userRankings,
    usageRecords,
    dismissedHints,
    cliApiKeys,
    userApiKeys,
    userDatabaseConfig,
    byodMigrations,
    settlementRuns,
    settlementAttempts,
    settlementEvents,
    settlementProjections,
  ] = await Promise.all([
    ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("userOnboarding")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("userRankings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("usageRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("dismissedHints")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("cliApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
    ctx.db
      .query("byodMigrations")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
    ctx.db
      .query("agentRuns")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect(),
    ctx.db
      .query("runAttempts")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect(),
    ctx.db
      .query("usageEvents")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect(),
    ctx.db
      .query("chatUsageProjections")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect(),
  ]);

  await Promise.all([
    ...userPreferences.map((r) => ctx.db.delete(r._id)),
    ...userOnboarding.map((r) => ctx.db.delete(r._id)),
    ...userStats.map((r) => ctx.db.delete(r._id)),
    ...userRankings.map((r) => ctx.db.delete(r._id)),
    ...usageRecords.map((r) => ctx.db.delete(r._id)),
    ...dismissedHints.map((r) => ctx.db.delete(r._id)),
    ...cliApiKeys.map((r) => ctx.db.delete(r._id)),
    ...userApiKeys.map((r) => ctx.db.delete(r._id)),
    ...userDatabaseConfig.map((r) => ctx.db.delete(r._id)),
    ...byodMigrations.map((r) => ctx.db.delete(r._id)),
    ...settlementEvents.map((r) => ctx.db.delete(r._id)),
    ...settlementProjections.map((r) => ctx.db.delete(r._id)),
    ...settlementAttempts.map((r) => ctx.db.delete(r._id)),
    ...settlementRuns.map((r) => ctx.db.delete(r._id)),
  ]);

  // A shared blob is retained while another user's record still references it.
  const remainingFileIds = new Set(
    (await ctx.db.query("files").collect()).map((file) => file.storageId),
  );
  for (const storageId of ownedBlobs) {
    const attachment = await ctx.db
      .query("attachments")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .first();
    if (
      !attachment &&
      !remainingFileIds.has(storageId) &&
      !(await isAudioCacheBlobReferenced(ctx, storageId))
    )
      await ctx.storage.delete(storageId);
  }
}
