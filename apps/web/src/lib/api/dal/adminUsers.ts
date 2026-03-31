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
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const updateRoleSchema = z.object({
  isAdmin: z.boolean(),
});

const updateTierSchema = z.object({
  tier: z.enum(["free", "tier1", "tier2"]),
});

const dateRangeSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

type ClerkAdminMetadata = {
  isAdmin: boolean;
  tier: AdminUserTier;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function emptyCostByFeature() {
  return {
    chat: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    notes: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    tasks: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    files: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    memory: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    smart_assistant: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    slides: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
  };
}

async function getClerkMetadata(clerkId: string): Promise<ClerkAdminMetadata> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkId);
  const metadata = (user.publicMetadata ?? {}) as {
    isAdmin?: boolean;
    tier?: AdminUserTier;
  };

  return {
    isAdmin: metadata.isAdmin === true,
    tier: metadata.tier ?? "free",
  };
}

async function upsertAdminSettings(
  userId: string,
  input: { isAdmin?: boolean; tier?: AdminUserTier },
) {
  const db = getPersistenceDb();

  await db
    .insert(userAdminSettings)
    .values({
      userId,
      isAdmin: input.isAdmin ?? false,
      tier: input.tier ?? "free",
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: userAdminSettings.userId,
      set: {
        ...(input.isAdmin !== undefined ? { isAdmin: input.isAdmin } : {}),
        ...(input.tier !== undefined ? { tier: input.tier } : {}),
        updatedAt: Date.now(),
      },
    });
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

function getDateFilter(startDate: string, endDate: string) {
  return and(
    gte(usageRecords.date, startDate),
    lte(usageRecords.date, endDate),
  );
}

async function reconcileAdminSettings() {
  const db = getPersistenceDb();
  const rows = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      isAdmin: userAdminSettings.isAdmin,
      tier: userAdminSettings.tier,
    })
    .from(users)
    .leftJoin(userAdminSettings, eq(userAdminSettings.userId, users.id));

  await Promise.all(
    rows.map(async (row) => {
      try {
        const metadata = await getClerkMetadata(row.clerkId);
        const needsUpsert =
          row.isAdmin === null ||
          row.isAdmin !== metadata.isAdmin ||
          row.tier === null;

        if (needsUpsert) {
          await upsertAdminSettings(row.id, {
            isAdmin: metadata.isAdmin,
            tier: row.tier ?? metadata.tier,
          });
        }
      } catch {
        // Best-effort reconciliation. If Clerk fetch fails, preserve DB state.
      }
    }),
  );
}

export const adminUsersDAL = {
  async listUsers() {
    const db = getPersistenceDb();
    await reconcileAdminSettings();

    const latestUsage = db
      .select({
        userId: usageRecords.userId,
        lastMessageDate: sql<string>`max(${usageRecords.date})`.as(
          "last_message_date",
        ),
      })
      .from(usageRecords)
      .groupBy(usageRecords.userId)
      .as("latest_usage");

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

    return formatEntityList(rows, "user");
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

    await updateClerkMetadata(user.clerkId, { isAdmin: validated.isAdmin });
    await upsertAdminSettings(userId, { isAdmin: validated.isAdmin });

    const metadata = await getClerkMetadata(user.clerkId);
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
        isAdmin: metadata.isAdmin,
        tier: metadata.tier,
        createdAt: updated?.createdAt ?? user.createdAt,
      },
      "user",
      userId,
    );
  },

  async updateTier(userId: string, payload: z.input<typeof updateTierSchema>) {
    const validated = updateTierSchema.parse(payload);
    const user = await ensureUserExists(userId);

    await updateClerkMetadata(user.clerkId, { tier: validated.tier });
    await upsertAdminSettings(userId, { tier: validated.tier });

    const metadata = await getClerkMetadata(user.clerkId);
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
        isAdmin: metadata.isAdmin,
        tier: validated.tier,
        createdAt: updated?.createdAt ?? user.createdAt,
      },
      "user",
      userId,
    );
  },
};
