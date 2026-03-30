/**
 * @vitest-environment node
 */
import {
  conversations,
  createMessageRepository,
  createUserRepository,
  users,
} from "@blah-chat/persistence-postgres";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const generateTextMock = vi.fn();
let getTokenMock = vi.fn();
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

vi.mock("@/lib/api/monitoring", () => ({
  trackAPIPerformance: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@blah-chat/ai/registry", () => ({
  getModel: vi.fn(() => "mock-model"),
}));

vi.mock("@blah-chat/ai/gateway", () => ({
  getGatewayOptions: vi.fn(() => ({})),
}));

vi.mock("server-only", () => ({}));

describe("conversation auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    getTokenMock = vi.fn(async () => {
      throw new Error("Convex token should not be requested");
    });
    generateTextMock.mockResolvedValue({
      text: "Generated REST Title",
      usage: {
        inputTokens: 10,
        outputTokens: 4,
      },
    });

    authMock.mockResolvedValue({
      userId: "clerk_phase4",
      getToken: getTokenMock,
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_phase4",
      primaryEmailAddress: { emailAddress: "phase4@example.com" },
      fullName: "Phase Four",
      firstName: "Phase",
      lastName: "Four",
      imageUrl: "https://example.com/phase4.png",
    });
  });

  it("jit-creates the Postgres user and fetches the conversation without a Convex token", async () => {
    const { POST } = await import("../conversations/route");
    const { GET } = await import("../conversations/[id]/route");

    const createResponse = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Phase 4 Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createJson = await createResponse.json();
    const created = unwrapData<{ _id: string; title: string }>(createJson);

    const persistedUser =
      await createUserRepository(db).findByClerkId("clerk_phase4");

    expect(persistedUser).toMatchObject({
      clerkId: "clerk_phase4",
      email: "phase4@example.com",
      name: "Phase Four",
    });

    const getResponse = await GET(
      createMockRequest(`/api/v1/conversations/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(getResponse.status).toBe(200);
    const getJson = await getResponse.json();
    const fetched = unwrapData<{ _id: string; title: string }>(getJson);

    expect(fetched).toMatchObject({
      _id: created._id,
      title: "Phase 4 Chat",
    });
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("reconciles a preexisting duplicate user row and preserves conversation history", async () => {
    const usersRepo = createUserRepository(db);
    const legacyUser = await usersRepo.upsertFromClerk({
      clerkId: "clerk_legacy_phase4",
      email: "phase4@example.com",
      name: "Legacy Phase Four",
    });

    await db.insert(conversations).values({
      userId: legacyUser.id,
      title: "Recovered History",
      model: "gpt-5",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.insert(users).values({
      clerkId: "clerk_phase4",
      email: "phase4@example.com",
      name: "Duplicate Phase Four",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { GET } = await import("../conversations/route");
    const response = await GET(
      createMockRequest("/api/v1/conversations?limit=100"),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const payload = unwrapData<{
      items: Array<{ data: { title: string } }>;
      total: number;
    }>(await response.json());

    expect(payload.total).toBe(1);
    expect(payload.items[0]?.data.title).toBe("Recovered History");

    const rows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${"phase4@example.com"}`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: legacyUser.id,
      clerkId: "clerk_phase4",
      name: "Phase Four",
    });
    expect(
      await usersRepo.findByClerkId("clerk_legacy_phase4"),
    ).toBeUndefined();
  });

  it("creates incognito conversations through REST with persisted settings", async () => {
    const { POST } = await import("../conversations/route");

    const response = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          isIncognito: true,
          incognitoSettings: {
            enableReadTools: false,
            applyCustomInstructions: false,
            inactivityTimeoutMinutes: 15,
          },
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(201);
    const created = unwrapData<{
      _id: string;
      title: string;
      isIncognito: boolean;
      incognitoSettings?: {
        enableReadTools: boolean;
        applyCustomInstructions: boolean;
        inactivityTimeoutMinutes?: number;
        lastActivityAt?: number;
      };
    }>(await response.json());

    expect(created.title).toBe("Incognito Chat");
    expect(created.isIncognito).toBe(true);
    expect(created.incognitoSettings).toMatchObject({
      enableReadTools: false,
      applyCustomInstructions: false,
      inactivityTimeoutMinutes: 15,
    });
    expect(created.incognitoSettings?.lastActivityAt).toEqual(
      expect.any(Number),
    );
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("returns and dismisses a Postgres model recommendation through REST", async () => {
    const { POST } = await import("../conversations/route");
    const { GET } = await import("../conversations/[id]/route");
    const { POST: dismissRecommendation } = await import(
      "../conversations/[id]/model-recommendation/dismiss/route"
    );

    const createResponse = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "openai:gpt-5",
          title: "Recommendation Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const created = unwrapData<{ _id: string }>(await createResponse.json());

    await db
      .update(conversations)
      .set({
        modelRecommendation: {
          suggestedModelId: "openai:gpt-5-mini",
          currentModelId: "openai:gpt-5",
          reasoning: "This request can use a cheaper model.",
          estimatedSavings: { percentSaved: 94 },
          createdAt: 123,
          dismissed: false,
        },
      })
      .where(eq(conversations.id, created._id));

    const getResponse = await GET(
      createMockRequest(`/api/v1/conversations/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(getResponse.status).toBe(200);
    expect(
      unwrapData<any>(await getResponse.json()).modelRecommendation,
    ).toMatchObject({
      suggestedModelId: "openai:gpt-5-mini",
      dismissed: false,
    });

    const dismissResponse = await dismissRecommendation(
      createMockRequest(
        `/api/v1/conversations/${created._id}/model-recommendation/dismiss`,
        {
          method: "POST",
        },
      ),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(dismissResponse.status).toBe(200);
    expect(
      unwrapData<any>(await dismissResponse.json()).modelRecommendation,
    ).toMatchObject({
      suggestedModelId: "openai:gpt-5-mini",
      dismissed: true,
    });
  });

  it("jit-creates the Postgres user for preferences routes too", async () => {
    const { PATCH, GET } = await import("../preferences/route");

    const patchResponse = await PATCH(
      createMockRequest("/api/v1/preferences", {
        method: "PATCH",
        body: {
          key: "theme",
          value: "vesper",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(patchResponse.status).toBe(200);
    const patchJson = await patchResponse.json();
    expect(unwrapData<{ key: string; value: string }>(patchJson)).toEqual({
      key: "theme",
      value: "vesper",
    });

    const getResponse = await GET(
      createMockRequest("/api/v1/preferences?key=theme"),
      { params: Promise.resolve({}) },
    );

    expect(getResponse.status).toBe(200);
    const getJson = await getResponse.json();
    expect(unwrapData<{ key: string; value: string }>(getJson)).toEqual({
      key: "theme",
      value: "vesper",
    });
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("renames and deletes a conversation through REST", async () => {
    const { POST } = await import("../conversations/route");
    const { GET, PATCH, DELETE } = await import("../conversations/[id]/route");

    const createResponse = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Before Rename",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createJson = await createResponse.json();
    const created = unwrapData<{ _id: string }>(createJson);

    const persistedUser =
      await createUserRepository(db).findByClerkId("clerk_phase4");
    expect(persistedUser).toBeTruthy();

    const message = await createMessageRepository(db).create({
      conversationId: created._id,
      userId: persistedUser!.id,
      role: "user",
      content: "Keep me until delete",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const patchResponse = await PATCH(
      createMockRequest(`/api/v1/conversations/${created._id}`, {
        method: "PATCH",
        body: {
          title: "After Rename",
          model: "openai:gpt-5",
        },
      }),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(patchResponse.status).toBe(200);
    const patchJson = await patchResponse.json();
    expect(
      unwrapData<{ _id: string; title: string; model: string }>(patchJson),
    ).toMatchObject({
      _id: created._id,
      title: "After Rename",
      model: "openai:gpt-5",
    });

    const getResponse = await GET(
      createMockRequest(`/api/v1/conversations/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(getResponse.status).toBe(200);

    const deleteResponse = await DELETE(
      createMockRequest(`/api/v1/conversations/${created._id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(deleteResponse.status).toBe(200);
    const deleteJson = await deleteResponse.json();
    expect(
      unwrapData<{ deleted: boolean; conversationId: string }>(deleteJson),
    ).toEqual({
      deleted: true,
      conversationId: created._id,
    });

    const deletedConversation = await db.query.conversations.findFirst({
      where: (table, { eq }) => eq(table.id, created._id),
    });
    const deletedMessage = await db.query.messages.findFirst({
      where: (table, { eq }) => eq(table.id, message.id),
    });

    expect(deletedConversation).toBeUndefined();
    expect(deletedMessage).toBeUndefined();

    const missingResponse = await GET(
      createMockRequest(`/api/v1/conversations/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(missingResponse.status).toBe(404);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("auto-renames a conversation through REST without Convex", async () => {
    const { POST } = await import("../conversations/route");
    const { POST: autoRename } = await import(
      "../conversations/[id]/auto-rename/route"
    );

    const createResponse = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Manual Title",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const created = unwrapData<{ _id: string }>(await createResponse.json());
    const persistedUser =
      await createUserRepository(db).findByClerkId("clerk_phase4");

    await createMessageRepository(db).create({
      conversationId: created._id,
      userId: persistedUser!.id,
      role: "user",
      content: "Summarize the new REST auto rename path",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const response = await autoRename(
      createMockRequest(`/api/v1/conversations/${created._id}/auto-rename`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(response.status).toBe(200);
    const renamed = unwrapData<{
      _id: string;
      title: string;
    }>(await response.json());

    expect(renamed).toMatchObject({
      _id: created._id,
      title: "Generated REST Title",
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("toggles pin and star, then archives the conversation through REST", async () => {
    const { POST } = await import("../conversations/route");
    const { GET } = await import("../conversations/[id]/route");
    const { POST: pinConversation } = await import(
      "../conversations/[id]/pin/route"
    );
    const { POST: starConversation } = await import(
      "../conversations/[id]/star/route"
    );
    const { POST: archiveConversation } = await import(
      "../conversations/[id]/archive/route"
    );

    const createResponse = await POST(
      createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: {
          model: "gpt-5",
          title: "Flags Chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createJson = await createResponse.json();
    const created = unwrapData<{ _id: string }>(createJson);

    const pinResponse = await pinConversation(
      createMockRequest(`/api/v1/conversations/${created._id}/pin`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(pinResponse.status).toBe(200);
    expect(
      unwrapData<{ pinned: boolean }>(await pinResponse.json()).pinned,
    ).toBe(true);

    const starResponse = await starConversation(
      createMockRequest(`/api/v1/conversations/${created._id}/star`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(starResponse.status).toBe(200);
    expect(
      unwrapData<{ starred: boolean }>(await starResponse.json()).starred,
    ).toBe(true);

    const archiveResponse = await archiveConversation(
      createMockRequest(`/api/v1/conversations/${created._id}/archive`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(archiveResponse.status).toBe(200);
    expect(
      unwrapData<{ archived: boolean }>(await archiveResponse.json()).archived,
    ).toBe(true);

    const getResponse = await GET(
      createMockRequest(`/api/v1/conversations/${created._id}`),
      { params: Promise.resolve({ id: created._id }) },
    );

    expect(getResponse.status).toBe(200);
    expect(
      unwrapData<{
        _id: string;
        pinned: boolean;
        starred: boolean;
        archived: boolean;
      }>(await getResponse.json()),
    ).toMatchObject({
      _id: created._id,
      pinned: true,
      starred: true,
      archived: true,
    });
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});
