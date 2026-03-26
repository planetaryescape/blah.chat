/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  messageEmbeddings,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const fetchActionMock = vi.fn(async () => {
  throw new Error("fetchAction should not be called");
});
let getTokenMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("convex/nextjs", () => ({
  fetchAction: fetchActionMock,
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

describe("search auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Token should not be requested");
    });

    authMock.mockResolvedValue({
      userId: "clerk_search",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_search",
      primaryEmailAddress: { emailAddress: "search@example.com" },
      fullName: "Search User",
      firstName: "Search",
      lastName: "User",
      imageUrl: "https://example.com/search.png",
    });
  });

  it("searches Postgres-backed message embeddings without calling Convex", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_search",
      email: "search@example.com",
      name: "Search User",
      imageUrl: "https://example.com/search.png",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Search Chat",
      model: "openai:gpt-5-mini",
    });

    const matching = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Tell me about solar eclipses",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    const other = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Pasta recipe ideas",
      parentMessageIds: [],
      siblingIndex: 1,
    });

    await db.insert(messageEmbeddings).values([
      {
        messageId: matching.id,
        conversationId: conversation.id,
        userId: user.id,
        content: matching.content,
        embedding: [0.9, 0.1],
        searchDocument: matching.content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        messageId: other.id,
        conversationId: conversation.id,
        userId: user.id,
        content: other.content,
        embedding: [0.1, 0.9],
        searchDocument: other.content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    const { POST } = await import("../search/hybrid/route");
    const response = await POST(
      createMockRequest("/api/v1/search/hybrid", {
        method: "POST",
        body: {
          query: "solar eclipse",
          conversationId: conversation.id,
          limit: 10,
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data: Array<{
        data: { _id: string; content: string; conversationId: string };
      }>;
    };
    const results =
      unwrapData<
        Array<{
          data: { _id: string; content: string; conversationId: string };
        }>
      >(json);
    expect(results[0]?.data).toMatchObject({
      _id: matching.id,
      content: matching.content,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
    });
    expect(results.some((entry) => entry.data._id === other.id)).toBe(false);
    expect(fetchActionMock).not.toHaveBeenCalled();
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
