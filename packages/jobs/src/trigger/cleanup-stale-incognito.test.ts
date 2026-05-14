import {
  conversations,
  createConversationRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { cleanupStaleIncognito } from "./cleanup-stale-incognito";

const HOUR = 60 * 60 * 1000;

async function seedIncognitoConversation(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  opts: { lastActivityAge: number },
) {
  const users = createUserRepository(db);
  const convos = createConversationRepository(db);

  const user = await users.upsertFromClerk({
    clerkId: `clerk_${Math.random().toString(36).slice(2)}`,
    email: "test@example.com",
    name: "Test User",
  });

  const conversation = await convos.create({
    userId: user.id,
    title: "Incognito Chat",
    model: "openai:gpt-5-mini",
  });

  const now = Date.now();
  await db
    .update(conversations)
    .set({
      isIncognito: true,
      incognitoSettings: {
        enableReadTools: true,
        applyCustomInstructions: true,
        lastActivityAt: now - opts.lastActivityAge,
      },
    })
    .where(eq(conversations.id, conversation.id));

  return { user, conversation };
}

describe("cleanupStaleIncognito", () => {
  it("deletes incognito conversations inactive for >24h", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const { conversation } = await seedIncognitoConversation(db, {
      lastActivityAge: 25 * HOUR,
    });

    const result = await cleanupStaleIncognito({ db, now });

    expect(result.deleted).toBe(1);

    const remaining = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(remaining).toBeUndefined();
  });

  it("does not delete incognito conversations active within 24h", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();

    const { conversation } = await seedIncognitoConversation(db, {
      lastActivityAge: 12 * HOUR,
    });

    const result = await cleanupStaleIncognito({ db, now });

    expect(result.deleted).toBe(0);

    const remaining = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(remaining).toBeDefined();
  });

  it("does not delete non-incognito conversations", async () => {
    const db = await createTestPersistenceDb();
    const now = Date.now();
    const users = createUserRepository(db);
    const convos = createConversationRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_regular",
      email: "test@example.com",
      name: "Test User",
    });

    const conversation = await convos.create({
      userId: user.id,
      title: "Regular Chat",
      model: "openai:gpt-5-mini",
    });

    // Backdate it
    await db
      .update(conversations)
      .set({ updatedAt: now - 48 * HOUR })
      .where(eq(conversations.id, conversation.id));

    const result = await cleanupStaleIncognito({ db, now });

    expect(result.deleted).toBe(0);
  });
});
