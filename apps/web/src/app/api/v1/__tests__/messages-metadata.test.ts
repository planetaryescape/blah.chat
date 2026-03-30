/**
 * @vitest-environment node
 */
import {
  attachments,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  messageToolCalls,
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

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");
  return {
    ...actual,
    createSignedReadUrl: vi.fn(async ({ key }: { key: string }) => {
      return `https://r2.example/read/${key}`;
    }),
  };
});

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/persistence/storage", () => ({
  getPersistenceEnv: () => ({
    r2: {
      bucket: "blah-chat-prod",
    },
  }),
  getPersistenceR2Client: vi.fn(() => ({})),
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

describe("/api/v1/messages/metadata", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_metadata",
      getToken: vi.fn(async () => {
        throw new Error("Convex token should not be requested");
      }),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_metadata",
      primaryEmailAddress: { emailAddress: "metadata@example.com" },
      fullName: "Metadata User",
      firstName: "Metadata",
      lastName: "User",
      imageUrl: "https://example.com/metadata.png",
      publicMetadata: {},
    });
  });

  it("returns attachments, tool calls, and sources from Postgres", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_metadata",
      email: "metadata@example.com",
      name: "Metadata User",
      imageUrl: "https://example.com/metadata.png",
    });

    const conversation = await conversations.create({
      userId: user.id,
      title: "Metadata Chat",
      model: "openai:gpt-5-mini",
    });

    const assistantMessage = await messages.create({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: "Tool-backed response",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await db.insert(attachments).values({
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      userId: user.id,
      type: "file",
      key: `users/${user.id}/conversations/${conversation.id}/notes.txt`,
      bucket: "blah-chat-prod",
      name: "notes.txt",
      mimeType: "text/plain",
      size: 128,
      createdAt: Date.now(),
    });

    await db.insert(messageToolCalls).values({
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      userId: user.id,
      toolCallId: "tool_1",
      toolName: "webSearch",
      args: { query: "postgres rewrite" },
      result: { hits: 3 },
      textPosition: 12,
      isPartial: false,
      timestamp: 1234,
      createdAt: Date.now(),
    });

    await persistMessageSources({
      db,
      messageId: assistantMessage.id,
      conversationId: conversation.id,
      userId: user.id,
      provider: "perplexity",
      sources: [
        {
          position: 1,
          title: "Rewrite Spec",
          url: "https://example.com/spec",
          snippet: "Spec body",
        },
      ],
    });

    const [metadata] = await db.query.sourceMetadata.findMany();
    await db
      .update(sourceMetadata)
      .set({
        title: "Canonical Spec",
        enriched: true,
      })
      .where(eq(sourceMetadata.id, metadata!.id));
    const legacyAttachmentQuery = vi
      .spyOn(db.query.attachments, "findMany")
      .mockImplementation((() => {
        throw new Error("legacy attachment query should not be called");
      }) as any);

    const { POST } = await import("../messages/metadata/route");
    const response = await POST(
      createMockRequest("/api/v1/messages/metadata", {
        method: "POST",
        body: { messageIds: [assistantMessage.id] },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const data = unwrapData<{
      attachments: Array<{ messageId: string; name: string }>;
      toolCalls: Array<{
        messageId: string;
        toolCallId: string;
        toolName: string;
        args: { query: string };
      }>;
      sources: Array<{
        messageId: string;
        title: string;
        metadata: { title?: string; enriched: boolean } | null;
      }>;
    }>((await response.json()) as any);

    expect(data.attachments).toHaveLength(1);
    expect(data.attachments[0]).toMatchObject({
      messageId: assistantMessage.id,
      name: "notes.txt",
    });
    expect(legacyAttachmentQuery).not.toHaveBeenCalled();
    expect(data.toolCalls).toHaveLength(1);
    expect(data.toolCalls[0]).toMatchObject({
      messageId: assistantMessage.id,
      toolCallId: "tool_1",
      toolName: "webSearch",
      args: { query: "postgres rewrite" },
    });
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0]).toMatchObject({
      messageId: assistantMessage.id,
      title: "Rewrite Spec",
      metadata: {
        title: "Canonical Spec",
        enriched: true,
      },
    });
  });
});
