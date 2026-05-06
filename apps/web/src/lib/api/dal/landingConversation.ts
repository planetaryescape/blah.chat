import { DEFAULT_MODEL_ID } from "@blah-chat/ai/operational-models";
import {
  conversations,
  createConversationRepository,
  messages,
  userPreferences,
} from "@blah-chat/persistence-postgres";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { setConversationSelectedIntegrations } from "@/lib/persistence/conversationIntegrations";
import {
  type EnsureCurrentUserOptions,
  ensureCurrentPersistenceUser,
} from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import "server-only";

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

async function findReusableEmpty(userId: string): Promise<string | undefined> {
  const db = getPersistenceDb();
  const candidates = await db
    .select({ id: conversations.id })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.archived, false),
        eq(conversations.isIncognito, false),
      ),
    )
    .groupBy(conversations.id)
    .having(sql`count(${messages.id}) = 0`)
    .orderBy(desc(conversations.updatedAt))
    .limit(1);
  return candidates[0]?.id;
}

async function adoptReusedConversation(
  conversationId: string,
  userId: string,
  model: string,
) {
  const db = getPersistenceDb();
  await db
    .update(conversations)
    .set({ model, updatedAt: Date.now() })
    .where(eq(conversations.id, conversationId));
  await setConversationSelectedIntegrations({
    db,
    conversationId,
    userId,
    selectedIntegrationIds: [],
    source: "rest_landing_dispatch",
  });
}

export async function getOrCreateLandingConversation(
  clerkUserId: string,
  options: EnsureCurrentUserOptions = {},
): Promise<string> {
  const user = await ensureCurrentPersistenceUser(clerkUserId, options);
  const model = await resolveDefaultModel(user.id);

  const reuseId = await findReusableEmpty(user.id);
  if (reuseId) {
    await adoptReusedConversation(reuseId, user.id, model);
    return reuseId;
  }

  const repo = createConversationRepository(getPersistenceDb());
  const created = await repo.create({
    userId: user.id,
    title: "New Chat",
    model,
  });
  return created.id;
}
