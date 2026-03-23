/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
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

describe("bookmarks auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_bookmarks",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_bookmarks",
      primaryEmailAddress: { emailAddress: "bookmarks@example.com" },
      fullName: "Bookmark User",
      firstName: "Bookmark",
      lastName: "User",
      imageUrl: "https://example.com/bookmarks.png",
    });
  });

  it("bulk bookmarks owned search results through the v1 Postgres route", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_bookmarks",
      email: "bookmarks@example.com",
      name: "Bookmark User",
      imageUrl: "https://example.com/bookmarks.png",
    });
    const conversation = await conversations.create({
      userId: user.id,
      title: "Bookmark Chat",
      model: "openai:gpt-5-mini",
    });
    const message = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Remember this result",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const { POST } = await import("../bookmarks/bulk/route");
    const response = await POST(
      createMockRequest("/api/v1/bookmarks/bulk", {
        method: "POST",
        body: {
          messageIds: [message.id],
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { bookmarkedCount: number; bookmarkIds: string[] };
    };
    const data = unwrapData<{
      bookmarkedCount: number;
      bookmarkIds: string[];
    }>(json);
    expect(data.bookmarkedCount).toBe(1);
    expect(data.bookmarkIds).toHaveLength(1);
  });
});
