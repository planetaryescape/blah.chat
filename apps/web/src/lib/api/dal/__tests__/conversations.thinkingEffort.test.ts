/**
 * @vitest-environment node
 */
import {
  conversations as conversationsTable,
  createConversationRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;
let persistenceUserId: string;

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/persistence/current-user", () => ({
  ensureCurrentPersistenceUser: vi.fn(async () => ({
    id: persistenceUserId,
    clerkId: "clerk_effort",
    email: "effort@example.com",
    name: "Effort User",
    imageUrl: null,
  })),
}));

async function seed() {
  const user = await createUserRepository(db).upsertFromClerk({
    clerkId: "clerk_effort",
    email: "effort@example.com",
    name: "Effort User",
  });
  persistenceUserId = user.id;

  const conversation = await createConversationRepository(db).create({
    userId: user.id,
    title: "Effort Chat",
    model: "openai:gpt-5",
  });

  return conversation;
}

describe("conversationsDAL thinkingEffort", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
  });

  it("persists thinkingEffort on update and returns it in the envelope", async () => {
    const conversation = await seed();
    const { conversationsDAL } = await import("../conversations");

    const result = await conversationsDAL.update(
      "clerk_effort",
      conversation.id,
      { thinkingEffort: "high" },
    );

    expect(result.data?.thinkingEffort).toBe("high");

    const row = await db.query.conversations.findFirst({
      where: eq(conversationsTable.id, conversation.id),
    });
    expect(row?.thinkingEffort).toBe("high");
  });

  it("returns persisted thinkingEffort from getById after reload", async () => {
    const conversation = await seed();
    const { conversationsDAL } = await import("../conversations");

    await conversationsDAL.update("clerk_effort", conversation.id, {
      thinkingEffort: "medium",
    });
    const fetched = await conversationsDAL.getById(
      "clerk_effort",
      conversation.id,
    );

    expect(fetched.data?.thinkingEffort).toBe("medium");
  });

  it("defaults to none and leaves thinkingEffort untouched on unrelated updates", async () => {
    const conversation = await seed();
    const { conversationsDAL } = await import("../conversations");

    const initial = await conversationsDAL.getById(
      "clerk_effort",
      conversation.id,
    );
    expect(initial.data?.thinkingEffort).toBe("none");

    await conversationsDAL.update("clerk_effort", conversation.id, {
      thinkingEffort: "low",
    });
    const afterTitleChange = await conversationsDAL.update(
      "clerk_effort",
      conversation.id,
      { title: "Renamed" },
    );

    expect(afterTitleChange.data?.thinkingEffort).toBe("low");
  });
});
