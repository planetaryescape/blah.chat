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
const getPersistenceEnvMock = vi.fn(() => {
  throw new Error("getPersistenceEnv should not be called");
});
const getPersistenceR2ClientMock = vi.fn(() => {
  throw new Error("getPersistenceR2Client should not be called");
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

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: getPersistenceEnvMock,
  getPersistenceR2Client: getPersistenceR2ClientMock,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/api/monitoring", () => ({
  trackAPIPerformance: vi.fn(),
}));

vi.mock("server-only", () => ({}));

describe("message list auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });

    authMock.mockResolvedValue({
      userId: "clerk_phase5_list",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase5_list",
      primaryEmailAddress: { emailAddress: "phase5-list@example.com" },
      fullName: "Phase Five List",
      firstName: "Phase",
      lastName: "List",
      imageUrl: "https://example.com/phase5-list.png",
    });
  });

  it("lists attachment-less messages without touching persistence storage config", async () => {
    const { POST: createConversation } = await import("../conversations/route");
    const { GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createResponse = await createConversation(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "List Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createJson = await createResponse.json();
    const createdConversation = unwrapData<{ _id: string }>(createJson);

    const persistedUser =
      await createUserRepository(db).findByClerkId("clerk_phase5_list");
    expect(persistedUser).toBeTruthy();

    const messages = createMessageRepository(db);
    const conversations = createConversationRepository(db);

    const rootUser = await messages.create({
      conversationId: createdConversation._id,
      userId: persistedUser!.id,
      role: "user",
      content: "Root question",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    const assistant = await messages.create({
      conversationId: createdConversation._id,
      role: "assistant",
      content: "Answer",
      model: "gpt-5",
      parentMessageIds: [rootUser.id],
      siblingIndex: 0,
    });

    await conversations.setActiveLeaf({
      conversationId: createdConversation._id,
      activeLeafMessageId: assistant.id,
    });

    const listResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(listResponse.status).toBe(200);
    const listJson = (await listResponse.json()) as Array<{
      data: { _id: string };
    }>;
    expect(listJson.map((message) => message.data._id)).toEqual([
      rootUser.id,
      assistant.id,
    ]);
    expect(getPersistenceEnvMock).not.toHaveBeenCalled();
    expect(getPersistenceR2ClientMock).not.toHaveBeenCalled();
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
