import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import {
  conversations,
  createConversationRepository,
  createMessageRepository,
  messages,
  userPreferences,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { compactConversation } from "@/lib/conversations/compaction";
import { generateConversationTitle } from "@/lib/conversations/titleGeneration";
import {
  getConversationSelectedIntegrationIds,
  listConversationIntegrationEvents,
  setConversationSelectedIntegrations,
} from "@/lib/persistence/conversationIntegrations";
import {
  type EnsureCurrentUserOptions,
  ensureCurrentPersistenceUser,
} from "@/lib/persistence/current-user";
import { toApiConversation } from "@/lib/persistence/mappers";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";
import { z } from "zod";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1),
  selectedIntegrationIds: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  projectId: z.string().nullable().optional(),
  isIncognito: z.boolean().optional(),
  incognitoSettings: z
    .object({
      enableReadTools: z.boolean().optional(),
      applyCustomInstructions: z.boolean().optional(),
      inactivityTimeoutMinutes: z.number().optional(),
    })
    .optional(),
});

const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    model: z.string().min(1).optional(),
    selectedIntegrationIds: z.array(z.string()).optional(),
  })
  .partial();

const importMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.number().int().optional(),
  model: z.string().optional(),
});

const importConversationSchema = z.object({
  title: z.string().min(1).max(200),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  createdAt: z.number().int().optional(),
  messages: z.array(importMessageSchema),
});

const importBatchSchema = z.object({
  conversations: z.array(importConversationSchema).min(1).max(500),
});

const DEFAULT_IMPORT_MODEL = "openai/gpt-5";

async function getOwnedConversation(userId: string, conversationId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);

  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  return { db, user, conversation };
}

async function formatOwnedConversation(
  db: ReturnType<typeof getPersistenceDb>,
  conversationId: string,
) {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const [stats] = await db
    .select({
      messageCount: sql<number>`count(*)::int`,
      lastMessageAt: sql<number | null>`max(${messages.createdAt})`,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversation.id));
  const selectedIntegrationIds = await getConversationSelectedIntegrationIds(
    db,
    conversation.id,
  );

  return formatEntity(
    toApiConversation({
      ...conversation,
      messageCount: stats?.messageCount ?? 0,
      lastMessageAt: stats?.lastMessageAt ?? conversation.updatedAt,
      selectedIntegrationIds,
    }),
    "conversation",
    conversation.id,
  );
}

export const conversationsDAL = {
  create: async (
    userId: string,
    data: z.infer<typeof createConversationSchema>,
  ) => {
    const validated = createConversationSchema.parse(data);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(userId);
    const repo = createConversationRepository(db);
    const now = Date.now();

    const conversation = await repo.create({
      userId: user.id,
      title:
        validated.title ??
        (validated.isIncognito ? "Incognito Chat" : "New Chat"),
      model: validated.model,
      projectId: validated.projectId,
      isIncognito: validated.isIncognito ?? false,
      incognitoSettings: validated.isIncognito
        ? {
            enableReadTools:
              validated.incognitoSettings?.enableReadTools ?? true,
            applyCustomInstructions:
              validated.incognitoSettings?.applyCustomInstructions ?? true,
            inactivityTimeoutMinutes:
              validated.incognitoSettings?.inactivityTimeoutMinutes,
            lastActivityAt: now,
          }
        : null,
    });

    if ((validated.selectedIntegrationIds?.length ?? 0) > 0) {
      await setConversationSelectedIntegrations({
        db,
        conversationId: conversation.id,
        userId: user.id,
        selectedIntegrationIds: validated.selectedIntegrationIds ?? [],
        source: "composer",
      });
    }

    return formatEntity(
      toApiConversation({
        ...conversation,
        archived: conversation.archived,
        messageCount: 0,
        lastMessageAt: conversation.updatedAt,
        selectedIntegrationIds: validated.selectedIntegrationIds ?? [],
      }),
      "conversation",
      conversation.id,
    );
  },

  getById: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    return formatOwnedConversation(db, conversation.id);
  },

  list: async (
    userId: string,
    limit = 50,
    archived = false,
    _sessionToken?: string,
    _projectId?: string,
  ) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(userId);

    const rows = await db
      .select({
        conversation: conversations,
        messageCount: sql<number>`count(${messages.id})::int`,
        lastMessageAt: sql<number | null>`max(${messages.createdAt})`,
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, user.id),
          eq(conversations.archived, archived),
          _projectId && _projectId !== "none"
            ? eq(conversations.projectId, _projectId)
            : _projectId === "none"
              ? sql`${conversations.projectId} is null`
              : undefined,
        ),
      )
      .groupBy(conversations.id)
      .orderBy(
        desc(
          sql`coalesce(max(${messages.createdAt}), ${conversations.updatedAt})`,
        ),
      )
      .limit(limit);

    return rows.map((row) =>
      formatEntity(
        toApiConversation({
          ...row.conversation,
          messageCount: row.messageCount,
          lastMessageAt: row.lastMessageAt,
        }),
        "conversation",
        row.conversation.id,
      ),
    );
  },

  update: async (
    userId: string,
    conversationId: string,
    data: z.infer<typeof updateConversationSchema>,
  ) => {
    const validated = updateConversationSchema.parse(data);
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );

    if (validated.selectedIntegrationIds !== undefined) {
      await setConversationSelectedIntegrations({
        db,
        conversationId: conversation.id,
        userId: conversation.userId,
        selectedIntegrationIds: validated.selectedIntegrationIds,
        source: "composer",
      });
    }

    const [updated] = await db
      .update(conversations)
      .set({
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.model !== undefined ? { model: validated.model } : {}),
        updatedAt: Date.now(),
      })
      .where(eq(conversations.id, conversation.id))
      .returning();

    if (!updated) {
      throw new Error("Conversation not found");
    }

    const selectedIntegrationIds = await getConversationSelectedIntegrationIds(
      db,
      updated.id,
    );

    return formatEntity(
      toApiConversation({ ...updated, selectedIntegrationIds }),
      "conversation",
      updated.id,
    );
  },

  listIntegrationEvents: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const events = await listConversationIntegrationEvents(db, conversation.id);

    return events.map((event) =>
      formatEntity(
        {
          _id: event.id,
          conversationId: event.conversationId,
          integrationId: event.integrationId,
          integrationName: event.integrationName,
          action: event.action as "enabled" | "disabled",
          source: event.source,
          createdAt: event.createdAt,
          _creationTime: event.createdAt,
        },
        "conversationIntegrationEvent",
        event.id,
      ),
    );
  },

  autoRename: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const result = await generateConversationTitle({
      db,
      conversationId: conversation.id,
      force: true,
    });

    if (!result.title) {
      throw new Error("Failed to generate title");
    }

    return formatOwnedConversation(db, conversation.id);
  },

  archive: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const [updated] = await db
      .update(conversations)
      .set({
        archived: true,
        updatedAt: Date.now(),
      })
      .where(eq(conversations.id, conversation.id))
      .returning();

    if (!updated) {
      throw new Error("Conversation not found");
    }

    return formatEntity(toApiConversation(updated), "conversation", updated.id);
  },

  togglePin: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const updated = await createConversationRepository(db).togglePin(
      conversation.id,
    );
    return formatEntity(toApiConversation(updated), "conversation", updated.id);
  },

  toggleStar: async (userId: string, conversationId: string) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const updated = await createConversationRepository(db).toggleStar(
      conversation.id,
    );
    return formatEntity(toApiConversation(updated), "conversation", updated.id);
  },

  switchBranch: async (
    userId: string,
    conversationId: string,
    targetMessageId: string,
  ) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    const targetMessage = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, targetMessageId),
        eq(messages.conversationId, conversation.id),
      ),
    });

    if (!targetMessage) {
      throw new Error("Target message not found");
    }

    await createConversationRepository(db).setActiveLeaf({
      conversationId: conversation.id,
      activeLeafMessageId: targetMessage.id,
    });

    return formatEntity(
      {
        conversationId: conversation.id,
        activeLeafMessageId: targetMessage.id,
      },
      "conversation",
      conversation.id,
    );
  },

  delete: async (
    userId: string,
    conversationId: string,
    _sessionToken?: string,
  ) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );
    await db.delete(conversations).where(eq(conversations.id, conversation.id));

    return formatEntity(
      { deleted: true, conversationId },
      "conversation",
      conversationId,
    );
  },

  compact: async (
    userId: string,
    conversationId: string,
    targetModel?: string,
  ) => {
    const user = await ensureCurrentPersistenceUser(userId);
    const result = await compactConversation({
      db: getPersistenceDb(),
      userId: user.id,
      conversationId,
      targetModel,
    });

    return formatEntity(
      {
        conversationId: result.conversationId,
        messageId: result.messageId,
      },
      "conversation",
      result.conversationId,
    );
  },

  dismissModelRecommendation: async (
    userId: string,
    conversationId: string,
  ) => {
    const { db, conversation } = await getOwnedConversation(
      userId,
      conversationId,
    );

    const recommendation = conversation.modelRecommendation;
    if (!recommendation) {
      return formatEntity(
        toApiConversation(conversation),
        "conversation",
        conversation.id,
      );
    }

    const [updated] = await db
      .update(conversations)
      .set({
        modelRecommendation: {
          ...recommendation,
          dismissed: true,
        },
        updatedAt: Date.now(),
      })
      .where(eq(conversations.id, conversation.id))
      .returning();

    if (!updated) {
      throw new Error("Conversation not found");
    }

    return formatEntity(toApiConversation(updated), "conversation", updated.id);
  },

  cleanupEmpty: async (userId: string, keepOne: boolean) => {
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(userId);

    // Get all non-archived conversations for the user
    const userConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.userId, user.id),
        eq(conversations.archived, false),
      ),
      orderBy: [desc(conversations.updatedAt)],
    });

    // Find empty conversations (0 messages)
    const emptyConversations: typeof userConversations = [];
    for (const conv of userConversations) {
      const [stats] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));
      if ((stats?.count ?? 0) === 0) {
        emptyConversations.push(conv);
      }
    }

    // If keepOne, skip the most recent empty conversation
    const toDelete = keepOne ? emptyConversations.slice(1) : emptyConversations;

    for (const conv of toDelete) {
      await db.delete(conversations).where(eq(conversations.id, conv.id));
    }

    return formatEntity(
      { deletedCount: toDelete.length },
      "maintenance",
      "cleanup",
    );
  },

  importBatch: async (
    userId: string,
    payload: z.input<typeof importBatchSchema>,
  ) => {
    const validated = importBatchSchema.parse(payload);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(userId);
    const conversationsRepo = createConversationRepository(db);
    const messagesRepo = createMessageRepository(db);

    const conversationIds: string[] = [];
    const errors: Array<{ index: number; title: string; reason: string }> = [];

    for (const [index, payloadConv] of validated.conversations.entries()) {
      try {
        const model =
          payloadConv.model ??
          payloadConv.messages.find((m) => m.model)?.model ??
          DEFAULT_IMPORT_MODEL;

        const conversation = await conversationsRepo.create({
          userId: user.id,
          title: payloadConv.title,
          model,
        });

        let lastMessageId: string | null = null;
        for (const [msgIndex, msg] of payloadConv.messages.entries()) {
          const created = await messagesRepo.create({
            conversationId: conversation.id,
            userId: msg.role === "user" ? user.id : undefined,
            role: msg.role,
            content: msg.content,
            status: "complete",
            model: msg.role === "assistant" ? (msg.model ?? model) : undefined,
            parentMessageIds: lastMessageId ? [lastMessageId] : [],
            siblingIndex: 0,
          });
          lastMessageId = created.id;

          if (msg.createdAt) {
            await db
              .update(messages)
              .set({ createdAt: msg.createdAt, updatedAt: msg.createdAt })
              .where(eq(messages.id, created.id));
          }

          if (msgIndex === payloadConv.messages.length - 1) {
            await conversationsRepo.setActiveLeaf({
              conversationId: conversation.id,
              activeLeafMessageId: created.id,
            });
          }
        }

        if (payloadConv.createdAt) {
          await db
            .update(conversations)
            .set({
              createdAt: payloadConv.createdAt,
              updatedAt: payloadConv.createdAt,
            })
            .where(eq(conversations.id, conversation.id));
        }

        conversationIds.push(conversation.id);
      } catch (error) {
        errors.push({
          index,
          title: payloadConv.title,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return formatEntity(
      {
        success: errors.length === 0,
        importedCount: conversationIds.length,
        conversationIds,
        errors,
      },
      "import_result",
      `import-${Date.now()}`,
    );
  },
};

async function resolveDefaultModel(userId: string): Promise<string> {
  const db = getPersistenceDb();
  const prefs = await db.query.userPreferences.findMany({
    where: and(
      eq(userPreferences.userId, userId),
      inArray(userPreferences.key, ["defaultModel"]),
    ),
  });
  const found = prefs.find((p) => p.key === "defaultModel");
  if (typeof found?.value === "string" && found.value.length > 0) {
    return found.value;
  }
  return DEFAULT_MODEL_ID;
}

export async function getOrCreateLandingConversation(
  clerkUserId: string,
  options: EnsureCurrentUserOptions = {},
): Promise<string> {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId, options);
  const model = await resolveDefaultModel(user.id);

  const candidates = await db
    .select({ id: conversations.id })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, user.id),
        eq(conversations.archived, false),
        eq(conversations.isIncognito, false),
      ),
    )
    .groupBy(conversations.id)
    .having(sql`count(${messages.id}) = 0`)
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  const reuseTarget = candidates[0];
  if (reuseTarget) {
    await db
      .update(conversations)
      .set({ model, updatedAt: Date.now() })
      .where(eq(conversations.id, reuseTarget.id));
    await setConversationSelectedIntegrations({
      db,
      conversationId: reuseTarget.id,
      userId: user.id,
      selectedIntegrationIds: [],
      source: "rest_landing_dispatch",
    });
    return reuseTarget.id;
  }

  const repo = createConversationRepository(db);
  const created = await repo.create({
    userId: user.id,
    title: "New Chat",
    model,
  });
  return created.id;
}
