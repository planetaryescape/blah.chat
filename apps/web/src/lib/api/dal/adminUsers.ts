import {
  type AdminUserTier,
  bookmarks,
  notes,
  projects,
  tasks,
  templates,
  usageRecords,
  userAdminSettings,
  users,
} from "@blah-chat/persistence-postgres";
import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import logger from "@/lib/logger";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import {
  ADMIN_SETTINGS_RECONCILE_BATCH_SIZE,
  ADMIN_SETTINGS_RECONCILE_INTERVAL_MS,
  type ClerkAdminMetadata,
  dateRangeSchema,
  emptyCostByFeature,
  getDateFilter,
  parseClerkAdminMetadata,
  toAdminUserDto,
  toNumber,
  updateRoleSchema,
  updateTierSchema,
} from "./adminUsers.shared";
import "server-only";

async function getClerkMetadata(clerkId: string): Promise<ClerkAdminMetadata> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkId);
  return parseClerkAdminMetadata(user.publicMetadata);
}

async function saveAdminSettings(userId: string, input: ClerkAdminMetadata) {
  const db = getPersistenceDb();

  await db
    .insert(userAdminSettings)
    .values({
      userId,
      isAdmin: input.isAdmin,
      tier: input.tier,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: userAdminSettings.userId,
      set: {
        isAdmin: input.isAdmin,
        tier: input.tier,
        updatedAt: Date.now(),
      },
    });
}

async function getStoredAdminSettings(userId: string) {
  return getPersistenceDb().query.userAdminSettings.findFirst({
    where: eq(userAdminSettings.userId, userId),
  });
}

async function getEffectiveAdminSettings(
  userId: string,
  clerkId: string,
  options?: { refreshFromClerk?: boolean },
): Promise<ClerkAdminMetadata> {
  const existing = await getStoredAdminSettings(userId);

  if (existing && !options?.refreshFromClerk) {
    return {
      isAdmin: existing.isAdmin,
      tier: existing.tier,
    };
  }

  const metadata = await getClerkMetadata(clerkId);
  const merged = {
    isAdmin: metadata.isAdmin,
    tier: existing?.tier ?? metadata.tier,
  } satisfies ClerkAdminMetadata;

  if (
    !existing ||
    existing.isAdmin !== merged.isAdmin ||
    existing.tier !== merged.tier
  ) {
    await saveAdminSettings(userId, merged);
  }

  return merged;
}

async function updateClerkMetadata(
  clerkId: string,
  patch: Partial<{ isAdmin: boolean; tier: AdminUserTier }>,
) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;

  await clerk.users.updateUserMetadata(clerkId, {
    publicMetadata: {
      ...existing,
      ...patch,
    },
  });
}

async function ensureUserExists(userId: string) {
  const db = getPersistenceDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

function buildLatestUsageQuery(db: ReturnType<typeof getPersistenceDb>) {
  return db
    .select({
      userId: usageRecords.userId,
      lastMessageDate: sql<string>`max(${usageRecords.date})`.as(
        "last_message_date",
      ),
    })
    .from(usageRecords)
    .groupBy(usageRecords.userId)
    .as("latest_usage");
}

async function reconcileAdminSettings() {
  const db = getPersistenceDb();
  const cutoff = Date.now() - ADMIN_SETTINGS_RECONCILE_INTERVAL_MS;
  const rows = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      settingsUserId: userAdminSettings.userId,
      updatedAt: userAdminSettings.updatedAt,
    })
    .from(users)
    .leftJoin(userAdminSettings, eq(userAdminSettings.userId, users.id));

  const staleRows = rows.filter(
    (row) => row.settingsUserId === null || (row.updatedAt ?? 0) < cutoff,
  );

  for (
    let index = 0;
    index < staleRows.length;
    index += ADMIN_SETTINGS_RECONCILE_BATCH_SIZE
  ) {
    const batch = staleRows.slice(
      index,
      index + ADMIN_SETTINGS_RECONCILE_BATCH_SIZE,
    );

    await Promise.all(
      batch.map(async (row) => {
        try {
          await getEffectiveAdminSettings(row.id, row.clerkId, {
            refreshFromClerk: true,
          });
        } catch (err) {
          logger.warn(
            { userId: row.id, clerkId: row.clerkId, err },
            "reconcileAdminSettings: Clerk fetch failed",
          );
        }
      }),
    );
  }
}

export const adminUsersDAL = {
  async listUsers() {
    const db = getPersistenceDb();
    void reconcileAdminSettings().catch((err) => {
      logger.warn({ err }, "listUsers: admin settings reconciliation failed");
    });

    const latestUsage = buildLatestUsageQuery(db);

    const rows = await db
      .select({
        _id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        isAdmin: sql<boolean>`coalesce(${userAdminSettings.isAdmin}, false)`,
        tier: sql<AdminUserTier>`coalesce(${userAdminSettings.tier}, 'free')`,
        createdAt: users.createdAt,
        lastMessageDate: latestUsage.lastMessageDate,
      })
      .from(users)
      .leftJoin(userAdminSettings, eq(userAdminSettings.userId, users.id))
      .leftJoin(latestUsage, eq(latestUsage.userId, users.id))
      .orderBy(desc(users.createdAt));

    return formatEntityList(rows.map(toAdminUserDto), "user");
  },

  async getUser(userId: string) {
    const db = getPersistenceDb();
    const user = await ensureUserExists(userId);
    const settings = await getEffectiveAdminSettings(userId, user.clerkId, {
      refreshFromClerk: true,
    });
    const latestUsage = buildLatestUsageQuery(db);
    const rows = await db
      .select({
        _id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        createdAt: users.createdAt,
        lastMessageDate: latestUsage.lastMessageDate,
      })
      .from(users)
      .leftJoin(latestUsage, eq(latestUsage.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    const current = rows[0] ?? {
      _id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastMessageDate: null,
    };

    return formatEntity(
      toAdminUserDto({
        ...current,
        isAdmin: settings.isAdmin,
        tier: settings.tier,
      }),
      "user",
      userId,
    );
  },

  async listUsageSummary(input: z.input<typeof dateRangeSchema>) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);

    const rows = await db
      .select({
        userId: usageRecords.userId,
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
        totalRequests: sql<number>`count(*)`,
      })
      .from(usageRecords)
      .where(getDateFilter(validated.startDate, validated.endDate))
      .groupBy(usageRecords.userId);

    return formatEntityList(
      rows.map((row) => ({
        userId: row.userId,
        totalCost: toNumber(row.totalCost),
        totalTokens: toNumber(row.totalTokens),
        totalRequests: toNumber(row.totalRequests),
      })),
      "usage_summary",
    );
  },

  async getUsageSummary(
    userId: string,
    input: z.input<typeof dateRangeSchema>,
  ) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);
    await ensureUserExists(userId);

    const [usageRow] = await db
      .select({
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
        totalRequests: sql<number>`count(*)`,
        messageCount: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          getDateFilter(validated.startDate, validated.endDate),
        ),
      );

    const totalRequests = toNumber(usageRow?.totalRequests);
    const totalCost = toNumber(usageRow?.totalCost);

    return formatEntity(
      {
        totalCost,
        totalTokens: toNumber(usageRow?.totalTokens),
        totalRequests,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        messageCount: toNumber(usageRow?.messageCount),
      },
      "usage_summary",
      userId,
    );
  },

  async getDailySpend(userId: string, input: z.input<typeof dateRangeSchema>) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);
    await ensureUserExists(userId);

    const rows = await db
      .select({
        date: usageRecords.date,
        messageCount: sql<number>`coalesce(sum(${usageRecords.messageCount}), 0)`,
        requestCount: sql<number>`count(*)`,
        totalInputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens} + ${usageRecords.outputTokens}), 0)`,
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          getDateFilter(validated.startDate, validated.endDate),
        ),
      )
      .groupBy(usageRecords.date)
      .orderBy(usageRecords.date);

    return formatEntityList(
      rows.map((row) => ({
        date: row.date,
        messageCount: toNumber(row.messageCount),
        requestCount: toNumber(row.requestCount),
        totalInputTokens: toNumber(row.totalInputTokens),
        totalOutputTokens: toNumber(row.totalOutputTokens),
        totalTokens: toNumber(row.totalTokens),
        totalCost: toNumber(row.totalCost),
      })),
      "daily_spend",
    );
  },

  async getSpendByModel(
    userId: string,
    input: z.input<typeof dateRangeSchema>,
  ) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);
    await ensureUserExists(userId);

    const rows = await db
      .select({
        model: usageRecords.model,
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
        totalInputTokens: sql<number>`coalesce(sum(${usageRecords.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${usageRecords.outputTokens}), 0)`,
        requestCount: sql<number>`count(*)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          getDateFilter(validated.startDate, validated.endDate),
        ),
      )
      .groupBy(usageRecords.model)
      .orderBy(desc(sql`coalesce(sum(${usageRecords.cost}), 0)`));

    return formatEntityList(
      rows.map((row) => ({
        model: row.model,
        totalCost: toNumber(row.totalCost),
        totalInputTokens: toNumber(row.totalInputTokens),
        totalOutputTokens: toNumber(row.totalOutputTokens),
        requestCount: toNumber(row.requestCount),
      })),
      "model_spend",
    );
  },

  async getCostByType(userId: string, input: z.input<typeof dateRangeSchema>) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);
    await ensureUserExists(userId);

    const rows = await db
      .select({
        operationType: usageRecords.operationType,
        feature: usageRecords.feature,
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          getDateFilter(validated.startDate, validated.endDate),
        ),
      )
      .groupBy(usageRecords.operationType, usageRecords.feature);

    const result = {
      textGeneration: { cost: 0 },
      tts: { cost: 0 },
      transcription: { cost: 0 },
      images: { cost: 0 },
      slides: { cost: 0 },
    };

    for (const row of rows) {
      const cost = toNumber(row.totalCost);
      if (row.feature === "slides") {
        result.slides.cost += cost;
        continue;
      }

      switch (row.operationType) {
        case "text":
          result.textGeneration.cost += cost;
          break;
        case "tts":
          result.tts.cost += cost;
          break;
        case "stt":
          result.transcription.cost += cost;
          break;
        case "image":
          result.images.cost += cost;
          break;
      }
    }

    return formatEntity(result, "cost_by_type", userId);
  },

  async getCostByFeature(
    userId: string,
    input: z.input<typeof dateRangeSchema>,
  ) {
    const db = getPersistenceDb();
    const validated = dateRangeSchema.parse(input);
    await ensureUserExists(userId);

    const rows = await db
      .select({
        feature: usageRecords.feature,
        operationType: usageRecords.operationType,
        totalCost: sql<number>`coalesce(sum(${usageRecords.cost}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          getDateFilter(validated.startDate, validated.endDate),
        ),
      )
      .groupBy(usageRecords.feature, usageRecords.operationType);

    const result = emptyCostByFeature();

    for (const row of rows) {
      if (!row.feature) continue;
      const featureKey = row.feature as keyof ReturnType<
        typeof emptyCostByFeature
      >;
      if (!(featureKey in result)) continue;

      const cost = toNumber(row.totalCost);
      result[featureKey].total += cost;

      switch (row.operationType) {
        case "text":
          result[featureKey].text += cost;
          break;
        case "tts":
          result[featureKey].tts += cost;
          break;
        case "stt":
          result[featureKey].stt += cost;
          break;
        case "image":
          result[featureKey].image += cost;
          break;
      }
    }

    return formatEntity(result, "cost_by_feature", userId);
  },

  async getActivityStats(userId: string) {
    const db = getPersistenceDb();
    await ensureUserExists(userId);

    const [
      notesCount,
      projectsCount,
      bookmarksCount,
      templatesCount,
      tasksCount,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(notes)
        .where(eq(notes.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(templates)
        .where(eq(templates.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.userId, userId)),
    ]);

    return formatEntity(
      {
        notesCount: toNumber(notesCount[0]?.count),
        projectsCount: toNumber(projectsCount[0]?.count),
        bookmarksCount: toNumber(bookmarksCount[0]?.count),
        templatesCount: toNumber(templatesCount[0]?.count),
        tasksCount: toNumber(tasksCount[0]?.count),
      },
      "activity_stats",
      userId,
    );
  },

  async updateRole(userId: string, payload: z.input<typeof updateRoleSchema>) {
    const validated = updateRoleSchema.parse(payload);
    const user = await ensureUserExists(userId);
    const settings = await getEffectiveAdminSettings(userId, user.clerkId);

    await updateClerkMetadata(user.clerkId, { isAdmin: validated.isAdmin });
    await saveAdminSettings(userId, {
      isAdmin: validated.isAdmin,
      tier: settings.tier,
    });

    const updated = await getPersistenceDb().query.users.findFirst({
      where: eq(users.id, userId),
    });

    return formatEntity(
      {
        _id: userId,
        clerkId: user.clerkId,
        name: updated?.name ?? user.name,
        email: updated?.email ?? user.email,
        imageUrl: updated?.imageUrl ?? user.imageUrl ?? undefined,
        isAdmin: validated.isAdmin,
        tier: settings.tier,
        createdAt: updated?.createdAt ?? user.createdAt,
      },
      "user",
      userId,
    );
  },

  async updateTier(userId: string, payload: z.input<typeof updateTierSchema>) {
    const validated = updateTierSchema.parse(payload);
    const user = await ensureUserExists(userId);
    const settings = await getEffectiveAdminSettings(userId, user.clerkId, {
      refreshFromClerk: true,
    });

    await updateClerkMetadata(user.clerkId, { tier: validated.tier });
    await saveAdminSettings(userId, {
      isAdmin: settings.isAdmin,
      tier: validated.tier,
    });

    const updated = await getPersistenceDb().query.users.findFirst({
      where: eq(users.id, userId),
    });

    return formatEntity(
      {
        _id: userId,
        clerkId: user.clerkId,
        name: updated?.name ?? user.name,
        email: updated?.email ?? user.email,
        imageUrl: updated?.imageUrl ?? user.imageUrl ?? undefined,
        isAdmin: settings.isAdmin,
        tier: validated.tier,
        createdAt: updated?.createdAt ?? user.createdAt,
      },
      "user",
      userId,
    );
  },
};
