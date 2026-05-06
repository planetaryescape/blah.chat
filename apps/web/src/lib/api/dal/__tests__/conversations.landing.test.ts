/**
 * @vitest-environment node
 */
import {
  conversations as conversationsTable,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  userPreferences,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const currentUserMock = vi.fn();
const getUserMock = vi.fn();
const clerkClientMock = vi.fn(() =>
  Promise.resolve({ users: { getUser: getUserMock } }),
);
const afterMock = vi.fn(() => {});

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: currentUserMock,
  clerkClient: clerkClientMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

const CLERK_ID = "clerk_landing";
const FRESH_CLERK_USER = {
  id: CLERK_ID,
  primaryEmailAddress: { emailAddress: "landing@example.com" },
  fullName: "Landing User",
  firstName: "Landing",
  lastName: "User",
  imageUrl: "https://example.com/landing.png",
};

async function seedUser() {
  const repo = createUserRepository(db);
  return repo.upsertFromClerk({
    clerkId: CLERK_ID,
    email: "landing@example.com",
    name: "Landing User",
  });
}

async function countConversations(userId: string) {
  return db.query.conversations
    .findMany({
      where: (
        c: typeof conversationsTable._.columns,
        { eq: eqOp }: { eq: typeof eq },
      ) => eqOp(c.userId, userId),
    })
    .then((rows) => rows.length);
}

describe("getOrCreateLandingConversation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    currentUserMock.mockResolvedValue(FRESH_CLERK_USER);
    getUserMock.mockResolvedValue(FRESH_CLERK_USER);
  });

  it("creates a new conversation with the default model when user has none", async () => {
    const user = await seedUser();
    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );

    const id = await getOrCreateLandingConversation(CLERK_ID);

    const rows = await db.query.conversations.findMany({
      where: (c, { eq: eqOp }) => eqOp(c.userId, user.id),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.model).toBe("auto");
  });

  it("reuses the most recent empty conversation", async () => {
    const user = await seedUser();
    const repo = createConversationRepository(db);
    const older = await repo.create({
      userId: user.id,
      title: "Older Empty",
      model: "openai/gpt-4o",
    });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await repo.create({
      userId: user.id,
      title: "Newer Empty",
      model: "openai/gpt-4o",
    });

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    expect(id).toBe(newer.id);
    expect(id).not.toBe(older.id);
    expect(await countConversations(user.id)).toBe(2);
  });

  it("creates a new conversation when only non-empty ones exist", async () => {
    const user = await seedUser();
    const convRepo = createConversationRepository(db);
    const msgRepo = createMessageRepository(db);
    const filled = await convRepo.create({
      userId: user.id,
      title: "Has Messages",
      model: "openai/gpt-4o",
    });
    await msgRepo.create({
      conversationId: filled.id,
      role: "user",
      content: "Hello",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    expect(id).not.toBe(filled.id);
    expect(await countConversations(user.id)).toBe(2);
  });

  it("ignores incognito conversations when searching for reuse candidates", async () => {
    const user = await seedUser();
    const convRepo = createConversationRepository(db);
    await convRepo.create({
      userId: user.id,
      title: "Incognito Empty",
      model: "openai/gpt-4o",
      isIncognito: true,
    });

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    const created = await db.query.conversations.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, id),
    });
    expect(created?.isIncognito).toBe(false);
    expect(await countConversations(user.id)).toBe(2);
  });

  it("ignores archived conversations when searching for reuse candidates", async () => {
    const user = await seedUser();
    const convRepo = createConversationRepository(db);
    const archived = await convRepo.create({
      userId: user.id,
      title: "Archived Empty",
      model: "openai/gpt-4o",
    });
    await db
      .update(conversationsTable)
      .set({ archived: true })
      .where(eq(conversationsTable.id, archived.id));

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    expect(id).not.toBe(archived.id);
    expect(await countConversations(user.id)).toBe(2);
  });

  it("overwrites the empty conversation's model on reuse using user preference", async () => {
    const user = await seedUser();
    const convRepo = createConversationRepository(db);
    const empty = await convRepo.create({
      userId: user.id,
      title: "Empty",
      model: "openai/gpt-4o",
    });
    await db.insert(userPreferences).values({
      userId: user.id,
      key: "defaultModel",
      value: "anthropic/claude-3-5-sonnet",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    expect(id).toBe(empty.id);
    const updated = await db.query.conversations.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, empty.id),
    });
    expect(updated?.model).toBe("anthropic/claude-3-5-sonnet");
  });

  it("respects userPreferences.defaultModel when creating a new conversation", async () => {
    const user = await seedUser();
    await db.insert(userPreferences).values({
      userId: user.id,
      key: "defaultModel",
      value: "anthropic/claude-3-5-sonnet",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    const created = await db.query.conversations.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, id),
    });
    expect(created?.model).toBe("anthropic/claude-3-5-sonnet");
  });

  it("falls back to DEFAULT_MODEL_ID when no preference is set", async () => {
    const user = await seedUser();
    const { getOrCreateLandingConversation } = await import(
      "../landingConversation"
    );
    const id = await getOrCreateLandingConversation(CLERK_ID);

    const created = await db.query.conversations.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, id),
    });
    expect(created?.model).toBe("auto");
    expect(await countConversations(user.id)).toBe(1);
  });
});
