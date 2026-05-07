/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
} from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationV2Repository } from "@/lib/generation-v2/repository";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const processMock = vi.fn();
let getTokenMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/generation-v2/runtime", () => ({
  getGenerationV2Service: () => ({
    start: async (
      input: Parameters<
        ReturnType<typeof createGenerationV2Repository>["createRequest"]
      >[0],
    ) => createGenerationV2Repository(db).createRequest(input),
    process: processMock,
  }),
  getEnqueueGenerationProcessing: () => async (requestId: string) => {
    await processMock(requestId);
  },
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    after: (callback: () => Promise<void> | void) => {
      void callback();
    },
  };
});

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

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-test",
    },
  }),
  getPersistenceR2Client: vi.fn(() => ({})),
}));

vi.mock("server-only", () => ({}));

async function createConversationViaRoute() {
  const { POST: createConversation } = await import("../conversations/route");
  const createResponse = await createConversation(
    createMockRequest("/api/v1/conversations", {
      method: "POST",
      body: {
        model: "gpt-5",
        title: "Tree Chat",
      },
    }),
    { params: Promise.resolve({}) },
  );

  expect(createResponse.status).toBe(201);
  const createJson = await createResponse.json();
  return unwrapData<{ _id: string }>(createJson);
}

async function seedLinearConversation(conversationId: string) {
  const persistedUser =
    await createUserRepository(db).findByClerkId("clerk_phase5");
  expect(persistedUser).toBeTruthy();

  const messages = createMessageRepository(db);
  const conversations = createConversationRepository(db);

  const rootUser = await messages.create({
    conversationId,
    userId: persistedUser!.id,
    role: "user",
    content: "Root question",
    parentMessageIds: [],
    siblingIndex: 0,
  });
  const firstAssistant = await messages.create({
    conversationId,
    role: "assistant",
    content: "First answer",
    model: "gpt-5",
    parentMessageIds: [rootUser.id],
    siblingIndex: 0,
  });
  const followUpUser = await messages.create({
    conversationId,
    userId: persistedUser!.id,
    role: "user",
    content: "Follow-up question",
    parentMessageIds: [firstAssistant.id],
    siblingIndex: 0,
  });
  const followUpAssistant = await messages.create({
    conversationId,
    role: "assistant",
    content: "Original follow-up answer",
    model: "gpt-5",
    parentMessageIds: [followUpUser.id],
    siblingIndex: 0,
  });

  await conversations.setActiveLeaf({
    conversationId,
    activeLeafMessageId: followUpAssistant.id,
  });

  return {
    rootUser,
    firstAssistant,
    followUpUser,
    followUpAssistant,
  };
}

describe("conversation tree CRUD with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });
    processMock.mockResolvedValue(undefined);

    authMock.mockResolvedValue({
      userId: "clerk_phase5",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase5",
      primaryEmailAddress: { emailAddress: "phase5@example.com" },
      fullName: "Phase Five",
      firstName: "Phase",
      lastName: "Five",
      imageUrl: "https://example.com/phase5.png",
    });
  });

  it("forks, switches branch, and exposes the active path through the REST message list", async () => {
    const { PATCH: editMessage } = await import("../messages/[id]/route");
    const { POST: switchBranch } = await import(
      "../conversations/[id]/switch-branch/route"
    );
    const { GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createdConversation = await createConversationViaRoute();
    const { rootUser, firstAssistant, followUpUser, followUpAssistant } =
      await seedLinearConversation(createdConversation._id);

    const editResponse = await editMessage(
      createMockRequest(`/api/v1/messages/${followUpUser.id}`, {
        method: "PATCH",
        body: {
          content: "Edited follow-up question",
        },
      }),
      { params: Promise.resolve({ id: followUpUser.id }) },
    );

    expect(editResponse.status).toBe(202);
    const editJson = await editResponse.json();
    const editedBranch = unwrapData<{
      messageId: string;
      assistantMessageId: string;
      requestId: string;
    }>(editJson);
    expect(processMock).toHaveBeenCalledWith(editedBranch.requestId);

    const firstListResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(firstListResponse.status).toBe(200);
    const firstListJson = (await firstListResponse.json()) as Array<{
      data: { _id: string; isActiveBranch: boolean };
    }>;
    const firstActiveIds = firstListJson
      .filter((message) => message.data.isActiveBranch)
      .map((message) => message.data._id);

    expect(firstActiveIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      editedBranch.messageId,
      editedBranch.assistantMessageId,
    ]);

    const switchResponse = await switchBranch(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/switch-branch`,
        {
          method: "POST",
          body: {
            targetMessageId: followUpAssistant.id,
          },
        },
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(switchResponse.status).toBe(200);

    const secondListResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );
    const secondListJson = (await secondListResponse.json()) as Array<{
      data: { _id: string; isActiveBranch: boolean };
    }>;
    const secondActiveIds = secondListJson
      .filter((message) => message.data.isActiveBranch)
      .map((message) => message.data._id);

    expect(secondActiveIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      followUpUser.id,
      followUpAssistant.id,
    ]);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("never overwrites a user message in place, even if a client asks for createBranch false", async () => {
    const { PATCH: editMessage } = await import("../messages/[id]/route");

    const createdConversation = await createConversationViaRoute();
    const { followUpUser } = await seedLinearConversation(
      createdConversation._id,
    );

    const editResponse = await editMessage(
      createMockRequest(`/api/v1/messages/${followUpUser.id}`, {
        method: "PATCH",
        body: {
          content: "Edited follow-up question",
          createBranch: false,
        },
      }),
      { params: Promise.resolve({ id: followUpUser.id }) },
    );

    expect(editResponse.status).toBe(202);
    const editJson = await editResponse.json();
    const editedBranch = unwrapData<{
      messageId: string;
      assistantMessageId: string;
      requestId: string;
    }>(editJson);

    expect(editedBranch.messageId).not.toBe(followUpUser.id);
    expect(processMock).toHaveBeenCalledWith(editedBranch.requestId);

    const originalMessage = await db.query.messages.findFirst({
      where: (table, { eq }) => eq(table.id, followUpUser.id),
    });
    const editedMessage = await db.query.messages.findFirst({
      where: (table, { eq }) => eq(table.id, editedBranch.messageId),
    });

    expect(originalMessage?.content).toBe("Follow-up question");
    expect(editedMessage?.content).toBe("Edited follow-up question");
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("regenerates an assistant reply as a sibling branch and marks it active", async () => {
    const { POST: regenerateMessage } = await import(
      "../messages/[id]/regenerate/route"
    );
    const { GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createdConversation = await createConversationViaRoute();
    const { rootUser, firstAssistant, followUpUser, followUpAssistant } =
      await seedLinearConversation(createdConversation._id);

    const regenerateResponse = await regenerateMessage(
      createMockRequest(`/api/v1/messages/${followUpAssistant.id}/regenerate`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: followUpAssistant.id }) },
    );

    expect(regenerateResponse.status).toBe(202);
    const regenerateJson = await regenerateResponse.json();
    const regeneratedBranch = unwrapData<{
      assistantMessageId: string;
      requestId: string;
    }>(regenerateJson);

    expect(regeneratedBranch.assistantMessageId).not.toBe(followUpAssistant.id);
    expect(processMock).toHaveBeenCalledWith(regeneratedBranch.requestId);

    const listResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(listResponse.status).toBe(200);
    const listJson = (await listResponse.json()) as Array<{
      data: {
        _id: string;
        parentMessageId?: string;
        isActiveBranch: boolean;
      };
    }>;

    const siblingAssistantIds = listJson
      .filter((message) => message.data.parentMessageId === followUpUser.id)
      .map((message) => message.data._id);
    const activeIds = listJson
      .filter((message) => message.data.isActiveBranch)
      .map((message) => message.data._id);

    expect(siblingAssistantIds).toEqual([
      followUpAssistant.id,
      regeneratedBranch.assistantMessageId,
    ]);
    expect(activeIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      followUpUser.id,
      regeneratedBranch.assistantMessageId,
    ]);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("anchors a new send to an explicit parent message instead of the current active leaf", async () => {
    const { PATCH: editMessage } = await import("../messages/[id]/route");
    const { POST: switchBranch } = await import(
      "../conversations/[id]/switch-branch/route"
    );
    const { POST: sendMessage, GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createdConversation = await createConversationViaRoute();
    const { rootUser, firstAssistant, followUpUser, followUpAssistant } =
      await seedLinearConversation(createdConversation._id);

    const editResponse = await editMessage(
      createMockRequest(`/api/v1/messages/${followUpUser.id}`, {
        method: "PATCH",
        body: {
          content: "Edited follow-up question",
        },
      }),
      { params: Promise.resolve({ id: followUpUser.id }) },
    );
    const editJson = await editResponse.json();
    const editedBranch = unwrapData<{
      messageId: string;
      assistantMessageId: string;
      requestId: string;
    }>(editJson);

    const switchResponse = await switchBranch(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/switch-branch`,
        {
          method: "POST",
          body: {
            targetMessageId: followUpAssistant.id,
          },
        },
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );
    expect(switchResponse.status).toBe(200);

    const sendResponse = await sendMessage(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
        {
          method: "POST",
          body: {
            content: "Queued branch reply",
            modelId: "openai:gpt-5",
            parentMessageId: editedBranch.assistantMessageId,
            clientMessageId: "client-branch-anchor",
          },
        },
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(sendResponse.status).toBe(202);
    const sendJson = await sendResponse.json();
    const sent = unwrapData<{
      messageId: string;
      assistantMessageId: string;
      requestId: string;
    }>(sendJson);
    expect(processMock).toHaveBeenCalledWith(sent.requestId);

    const listResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(listResponse.status).toBe(200);
    const listJson = (await listResponse.json()) as Array<{
      data: {
        _id: string;
        clientMessageId?: string;
        parentMessageId?: string;
        isActiveBranch: boolean;
      };
    }>;
    const activeIds = listJson
      .filter((message) => message.data.isActiveBranch)
      .map((message) => message.data._id);
    const sentUserMessage = listJson.find(
      (message) => message.data._id === sent.messageId,
    );

    expect(sentUserMessage?.data.parentMessageId).toBe(
      editedBranch.assistantMessageId,
    );
    expect(sentUserMessage?.data.clientMessageId).toBe("client-branch-anchor");
    expect(activeIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      editedBranch.messageId,
      editedBranch.assistantMessageId,
      sent.messageId,
      sent.assistantMessageId,
    ]);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("deletes the active leaf message and repoints the active path to its parent", async () => {
    const { DELETE: deleteMessage } = await import("../messages/[id]/route");
    const { GET: listMessages } = await import(
      "../conversations/[id]/messages/route"
    );

    const createdConversation = await createConversationViaRoute();
    const { rootUser, firstAssistant, followUpUser, followUpAssistant } =
      await seedLinearConversation(createdConversation._id);

    const deleteResponse = await deleteMessage(
      createMockRequest(`/api/v1/messages/${followUpAssistant.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: followUpAssistant.id }) },
    );

    expect(deleteResponse.status).toBe(200);

    const listResponse = await listMessages(
      createMockRequest(
        `/api/v1/conversations/${createdConversation._id}/messages`,
      ),
      { params: Promise.resolve({ id: createdConversation._id }) },
    );

    expect(listResponse.status).toBe(200);
    const listJson = (await listResponse.json()) as Array<{
      data: { _id: string; isActiveBranch: boolean };
    }>;
    const remainingIds = listJson.map((message) => message.data._id);
    const activeIds = listJson
      .filter((message) => message.data.isActiveBranch)
      .map((message) => message.data._id);

    expect(remainingIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      followUpUser.id,
    ]);
    expect(activeIds).toEqual([
      rootUser.id,
      firstAssistant.id,
      followUpUser.id,
    ]);
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
