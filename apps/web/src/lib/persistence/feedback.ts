import {
  createSignedReadUrl,
  createTriggerClient,
  feedbackEntries,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";
import { getPersistenceEnv, getPersistenceR2Client } from "./storage";

const DEFAULT_STATUS_BY_TYPE = {
  bug: "new",
  feature: "submitted",
  praise: "received",
  other: "new",
} as const;

export async function createFeedbackEntry(
  clerkUserId: string,
  input: {
    feedbackType: "bug" | "feature" | "praise" | "other";
    description: string;
    page: string;
    whatTheyDid?: string;
    whatTheySaw?: string;
    whatTheyExpected?: string;
    screenshotKey?: string;
    userSuggestedUrgency?: "urgent" | "normal" | "low";
  },
) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const now = Date.now();

  const [feedback] = await db
    .insert(feedbackEntries)
    .values({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      page: input.page,
      feedbackType: input.feedbackType,
      description: input.description,
      whatTheyDid: input.whatTheyDid,
      whatTheySaw: input.whatTheySaw,
      whatTheyExpected: input.whatTheyExpected,
      screenshotKey: input.screenshotKey,
      userSuggestedUrgency: input.userSuggestedUrgency,
      status: DEFAULT_STATUS_BY_TYPE[input.feedbackType],
      priority: "none",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!feedback) {
    throw new Error("Failed to create feedback");
  }

  const trigger = createTriggerClient(parsePersistenceEnv(process.env));
  await trigger.triggerTask("auto-triage-feedback", {
    feedbackId: feedback.id,
  });

  return {
    _id: feedback.id,
    feedbackType: feedback.feedbackType,
    description: feedback.description,
    page: feedback.page,
    status: feedback.status,
    priority: feedback.priority,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

export async function listFeedbackEntries(input: {
  status?: string | null;
  feedbackType?: string | null;
  priority?: string | null;
  searchQuery?: string | null;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}) {
  const db = getPersistenceDb();
  const sortColumn =
    input.sortBy === "updatedAt"
      ? feedbackEntries.updatedAt
      : feedbackEntries.createdAt;
  const search = input.searchQuery?.trim();

  return db.query.feedbackEntries.findMany({
    where: sql.join(
      [
        sql`${feedbackEntries.archivedAt} is null`,
        input.status ? eq(feedbackEntries.status, input.status) : undefined,
        input.feedbackType
          ? eq(feedbackEntries.feedbackType, input.feedbackType)
          : undefined,
        input.priority
          ? eq(feedbackEntries.priority, input.priority)
          : undefined,
        search
          ? or(
              ilike(feedbackEntries.description, `%${search}%`),
              ilike(feedbackEntries.userName, `%${search}%`),
              ilike(feedbackEntries.userEmail, `%${search}%`),
            )
          : undefined,
      ].filter(Boolean) as any[],
      sql` and `,
    ),
    orderBy: input.sortOrder === "asc" ? sortColumn : desc(sortColumn),
  });
}

export async function getFeedbackCounts() {
  const db = getPersistenceDb();
  const rows = await db
    .select({
      status: feedbackEntries.status,
      count: sql<number>`count(*)::int`,
    })
    .from(feedbackEntries)
    .where(sql`${feedbackEntries.archivedAt} is null`)
    .groupBy(feedbackEntries.status);

  const counts = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    ...counts,
  };
}

export async function getFeedbackEntry(feedbackId: string) {
  const db = getPersistenceDb();
  const feedback = await db.query.feedbackEntries.findFirst({
    where: eq(feedbackEntries.id, feedbackId),
  });

  if (!feedback || feedback.archivedAt) {
    return null;
  }

  const screenshotUrl = feedback.screenshotKey
    ? await createSignedReadUrl({
        client: getPersistenceR2Client(),
        bucket: getPersistenceEnv().r2.bucket,
        key: feedback.screenshotKey,
      })
    : undefined;

  return {
    _id: feedback.id,
    userId: feedback.userId,
    userEmail: feedback.userEmail,
    userName: feedback.userName,
    page: feedback.page,
    feedbackType: feedback.feedbackType,
    description: feedback.description,
    whatTheyDid: feedback.whatTheyDid ?? undefined,
    whatTheySaw: feedback.whatTheySaw ?? undefined,
    whatTheyExpected: feedback.whatTheyExpected ?? undefined,
    screenshotKey: feedback.screenshotKey ?? undefined,
    screenshotUrl,
    userSuggestedUrgency: feedback.userSuggestedUrgency ?? undefined,
    status: feedback.status,
    priority: feedback.priority,
    tags: feedback.tags,
    aiTriage: feedback.aiTriage ?? undefined,
    errorContext: feedback.errorContext ?? undefined,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

export async function updateFeedbackStatus(feedbackId: string, status: string) {
  const db = getPersistenceDb();
  await db
    .update(feedbackEntries)
    .set({
      status,
      updatedAt: Date.now(),
    })
    .where(eq(feedbackEntries.id, feedbackId));
}

export async function updateFeedbackPriority(
  feedbackId: string,
  priority: string,
) {
  const db = getPersistenceDb();
  await db
    .update(feedbackEntries)
    .set({
      priority,
      updatedAt: Date.now(),
    })
    .where(eq(feedbackEntries.id, feedbackId));
}

export async function bulkUpdateFeedbackStatus(
  feedbackIds: string[],
  status: string,
) {
  if (feedbackIds.length === 0) {
    return;
  }

  const db = getPersistenceDb();
  await db
    .update(feedbackEntries)
    .set({
      status,
      updatedAt: Date.now(),
    })
    .where(inArray(feedbackEntries.id, feedbackIds));
}

export async function archiveFeedbackEntry(feedbackId: string) {
  const db = getPersistenceDb();
  const now = Date.now();
  await db
    .update(feedbackEntries)
    .set({
      archivedAt: now,
      updatedAt: now,
    })
    .where(eq(feedbackEntries.id, feedbackId));
}

export async function acceptFeedbackTriage(
  feedbackId: string,
  input: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  },
) {
  const db = getPersistenceDb();
  const feedback = await db.query.feedbackEntries.findFirst({
    where: eq(feedbackEntries.id, feedbackId),
  });

  if (!feedback?.aiTriage) {
    return null;
  }

  await db
    .update(feedbackEntries)
    .set({
      priority:
        input.acceptPriority && feedback.aiTriage.suggestedPriority
          ? feedback.aiTriage.suggestedPriority
          : feedback.priority,
      tags:
        input.acceptTags && feedback.aiTriage.suggestedTags?.length
          ? Array.from(
              new Set([...feedback.tags, ...feedback.aiTriage.suggestedTags]),
            )
          : feedback.tags,
      updatedAt: Date.now(),
    })
    .where(eq(feedbackEntries.id, feedbackId));

  return getFeedbackEntry(feedbackId);
}
