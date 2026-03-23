/**
 * @vitest-environment node
 */
import {
  attachments,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  sourceMetadata,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistMessageSources } from "@/lib/persistence/sources";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const { authMock, currentUserMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
}));
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

describe("sources auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_sources",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_sources",
      primaryEmailAddress: { emailAddress: "sources@example.com" },
      fullName: "Sources User",
      firstName: "Sources",
      lastName: "User",
      imageUrl: "https://example.com/sources.png",
      publicMetadata: {},
    });
  });

  it("lists enriched message sources and conversation sources from Postgres routes", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_sources",
      email: "sources@example.com",
      name: "Sources User",
      imageUrl: "https://example.com/sources.png",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Source Chat",
      model: "openai:gpt-5-mini",
    });

    const assistantMessage = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Here are the citations.",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await persistMessageSources({
      db,
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      userId: user.id,
      provider: "openrouter",
      sources: [
        {
          position: 1,
          title: "Postgres Rewrite Spec",
          url: "https://example.com/spec",
          snippet: "Spec body",
        },
      ],
    });

    const [metadata] = await db.query.sourceMetadata.findMany();
    expect(metadata).toBeDefined();
    await db
      .update(sourceMetadata)
      .set({
        title: "Canonical Spec",
        description: "Joined metadata description",
        siteName: "Example Docs",
        favicon: "https://example.com/favicon.ico",
        enriched: true,
      })
      .where(eq(sourceMetadata.id, metadata!.id));

    const messageRoute = await import("../messages/sources/route");
    const messageResponse = await messageRoute.GET(
      createMockRequest(
        `/api/v1/messages/sources?messageId=${assistantMessage.id}`,
      ),
      { params: Promise.resolve({}) },
    );

    expect(messageResponse.status).toBe(200);
    const messageSources = unwrapData<
      Array<{
        data: {
          _id: string;
          messageId: string;
          title: string;
          metadata: { title?: string; siteName?: string } | null;
        };
      }>
    >((await messageResponse.json()) as any);
    expect(messageSources).toHaveLength(1);
    expect(messageSources[0]?.data).toMatchObject({
      messageId: assistantMessage.id,
      title: "Postgres Rewrite Spec",
      metadata: {
        title: "Canonical Spec",
        siteName: "Example Docs",
      },
    });

    const conversationRoute = await import(
      "../conversations/[id]/sources/route"
    );
    const conversationResponse = await conversationRoute.GET(
      createMockRequest(`/api/v1/conversations/${conversation.id}/sources`),
      { params: Promise.resolve({ id: conversation.id }) },
    );

    expect(conversationResponse.status).toBe(200);
    const conversationSources = unwrapData<
      Array<{
        data: {
          conversationId: string;
          messageId: string;
          url: string;
        };
      }>
    >((await conversationResponse.json()) as any);
    expect(conversationSources).toHaveLength(1);
    expect(conversationSources[0]?.data).toMatchObject({
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      url: "https://example.com/spec",
    });
  });

  it("lists project attachments through a Postgres route", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_sources",
      email: "sources@example.com",
      name: "Sources User",
      imageUrl: "https://example.com/sources.png",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Project Chat",
      model: "openai:gpt-5-mini",
      projectId: "project_alpha",
    });

    const userMessage = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: "Attachment context",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await db.insert(attachments).values({
      messageId: userMessage.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      key: "users/user_1/projects/project_alpha/spec.pdf",
      bucket: "blah-chat-prod",
      name: "spec.pdf",
      mimeType: "application/pdf",
      size: 4096,
      createdAt: Date.now(),
    });

    const route = await import("../projects/[id]/attachments/route");
    const response = await route.GET(
      createMockRequest("/api/v1/projects/project_alpha/attachments"),
      { params: Promise.resolve({ id: "project_alpha" }) },
    );

    expect(response.status).toBe(200);
    const projectAttachments = unwrapData<
      Array<{
        data: {
          conversationId: string;
          name: string;
          mimeType: string;
          size: number;
        };
      }>
    >((await response.json()) as any);
    expect(projectAttachments).toHaveLength(1);
    expect(projectAttachments[0]?.data).toMatchObject({
      conversationId: conversation.id,
      name: "spec.pdf",
      mimeType: "application/pdf",
      size: 4096,
    });
  });
});
