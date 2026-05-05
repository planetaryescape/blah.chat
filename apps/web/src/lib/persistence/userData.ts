import {
  type AdminUserTier,
  bookmarks,
  cliApiKeys,
  composioConnections,
  conversations,
  feedbackEntries,
  knowledgeSources,
  messages,
  notes,
  projects,
  starterSuggestionCaches,
  tasks,
  templates,
  usageRecords,
  userAdminSettings,
  userApiKeys,
  userPreferences,
  users,
} from "@blah-chat/persistence-postgres";
import { clerkClient } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { BadRequestError } from "@/lib/api/errors";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";

export type ApiUser = {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  tier: AdminUserTier;
  isAdmin: boolean;
  createdAt: number;
  updatedAt: number;
};

async function getOwnedUser(clerkUserId: string) {
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  return { db, user };
}

export async function getCurrentUser(clerkUserId: string): Promise<ApiUser> {
  const { db, user } = await getOwnedUser(clerkUserId);
  const adminSettings = await db.query.userAdminSettings.findFirst({
    where: eq(userAdminSettings.userId, user.id),
  });
  return {
    _id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl ?? undefined,
    tier: adminSettings?.tier ?? "free",
    isAdmin: adminSettings?.isAdmin ?? false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function exportUserData(clerkUserId: string) {
  const { db, user } = await getOwnedUser(clerkUserId);
  const userConversations = await db.query.conversations.findMany({
    where: eq(conversations.userId, user.id),
    orderBy: [conversations.createdAt],
  });
  const conversationIds = userConversations.map(
    (conversation) => conversation.id,
  );
  const userMessages =
    conversationIds.length > 0
      ? await db.query.messages.findMany({
          where: inArray(messages.conversationId, conversationIds),
          orderBy: [messages.createdAt],
        })
      : [];

  const [
    userProjects,
    userNotes,
    userTasks,
    userBookmarks,
    userKnowledgeSources,
    userPreferencesRows,
    userCliApiKeys,
    userByokConfig,
    userConnections,
  ] = await Promise.all([
    db.query.projects.findMany({
      where: eq(projects.userId, user.id),
      orderBy: [projects.createdAt],
    }),
    db.query.notes.findMany({
      where: eq(notes.userId, user.id),
      orderBy: [notes.createdAt],
    }),
    db.query.tasks.findMany({
      where: eq(tasks.userId, user.id),
      orderBy: [tasks.createdAt],
    }),
    db.query.bookmarks.findMany({
      where: eq(bookmarks.userId, user.id),
      orderBy: [bookmarks.createdAt],
    }),
    db.query.knowledgeSources.findMany({
      where: eq(knowledgeSources.userId, user.id),
      orderBy: [knowledgeSources.createdAt],
    }),
    db.query.userPreferences.findMany({
      where: eq(userPreferences.userId, user.id),
    }),
    db.query.cliApiKeys.findMany({
      where: eq(cliApiKeys.userId, user.id),
      orderBy: [cliApiKeys.createdAt],
    }),
    db.query.userApiKeys.findFirst({
      where: eq(userApiKeys.userId, user.id),
    }),
    db.query.composioConnections.findMany({
      where: eq(composioConnections.userId, user.id),
      orderBy: [composioConnections.createdAt],
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    conversations: userConversations,
    messages: userMessages,
    projects: userProjects,
    notes: userNotes,
    tasks: userTasks,
    bookmarks: userBookmarks,
    knowledgeSources: userKnowledgeSources,
    cliApiKeys: userCliApiKeys,
    byokConfig: userByokConfig,
    composioConnections: userConnections,
    preferences: Object.fromEntries(
      userPreferencesRows.map((preference) => [
        preference.key,
        preference.value,
      ]),
    ),
  };
}

export async function deleteUserData(
  clerkUserId: string,
  confirmationText: string,
) {
  if (confirmationText !== "DELETE MY DATA") {
    throw new BadRequestError('Please type "DELETE MY DATA" to confirm');
  }

  const { db, user } = await getOwnedUser(clerkUserId);

  await db.transaction(async (tx) => {
    await tx.delete(conversations).where(eq(conversations.userId, user.id));
    await tx.delete(notes).where(eq(notes.userId, user.id));
    await tx.delete(tasks).where(eq(tasks.userId, user.id));
    await tx.delete(projects).where(eq(projects.userId, user.id));
    await tx.delete(templates).where(eq(templates.userId, user.id));
    await tx
      .delete(knowledgeSources)
      .where(eq(knowledgeSources.userId, user.id));
    await tx.delete(bookmarks).where(eq(bookmarks.userId, user.id));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, user.id));
    await tx.delete(usageRecords).where(eq(usageRecords.userId, user.id));
    await tx.delete(feedbackEntries).where(eq(feedbackEntries.userId, user.id));
    await tx
      .delete(starterSuggestionCaches)
      .where(eq(starterSuggestionCaches.userId, user.id));
    await tx.delete(cliApiKeys).where(eq(cliApiKeys.userId, user.id));
    await tx.delete(userApiKeys).where(eq(userApiKeys.userId, user.id));
    await tx
      .delete(composioConnections)
      .where(eq(composioConnections.userId, user.id));
  });

  return { success: true };
}

export async function deleteUserAccount(
  clerkUserId: string,
  confirmationText: string,
) {
  if (confirmationText !== "DELETE MY ACCOUNT") {
    throw new BadRequestError('Please type "DELETE MY ACCOUNT" to confirm');
  }

  const { db, user } = await getOwnedUser(clerkUserId);
  await deleteUserData(clerkUserId, "DELETE MY DATA");
  await db.delete(users).where(eq(users.id, user.id));

  const clerk = await clerkClient();
  await clerk.users.deleteUser(user.clerkId);

  return { success: true };
}
