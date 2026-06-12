/**
 * @vitest-environment node
 */
import {
  conversations,
  createConversationRepository,
  createMessageRepository,
  createUserRepository,
  memoryEmbeddings,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signActionJobId } from "@/lib/api/action-jobs";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const embedMock = vi.fn();
const triggerTaskMock = vi.fn();
const retrieveRunMock = vi.fn();
const getLimiterMock = vi.fn();
const applyRateLimitMock = vi.fn();
const enforceRateLimitMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("ai", () => ({
  embed: embedMock,
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createTriggerClient: vi.fn(() => ({
      ping: vi.fn(),
      triggerTask: triggerTaskMock,
      retrieveRun: retrieveRunMock,
    })),
    parsePersistenceEnv: vi.fn(() => ({
      databaseUrl: "postgres://user:pass@host/db",
      redis: {
        restUrl: "https://example.upstash.io",
        restToken: "token",
      },
      r2: {
        accountId: "account123",
        accessKeyId: "key",
        secretAccessKey: "secret",
        bucket: "blah-chat-prod",
        endpoint: "https://account123.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: {
        secretKey: "tr_dev_123",
        apiUrl: "https://api.trigger.dev",
      },
    })),
  };
});

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/api/rate-limit", () => ({
  getLimiter: getLimiterMock,
  applyRateLimit: applyRateLimitMock,
  enforceRateLimit: enforceRateLimitMock,
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

describe("memories auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    embedMock.mockResolvedValue({ embedding: [0.9, 0.1] });
    triggerTaskMock.mockResolvedValue({
      id: "run_123",
    });
    getLimiterMock.mockReturnValue(undefined);
    applyRateLimitMock.mockResolvedValue(null);
    enforceRateLimitMock.mockResolvedValue(null);
    retrieveRunMock.mockResolvedValue({
      id: "run_123",
      status: "QUEUED",
      isQueued: true,
      isExecuting: false,
      isWaiting: false,
      isCompleted: false,
      isSuccess: false,
      isFailed: false,
      isCancelled: false,
    });

    authMock.mockResolvedValue({
      userId: "clerk_memories",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_memories",
      primaryEmailAddress: { emailAddress: "memories@example.com" },
      fullName: "Memory User",
      firstName: "Memory",
      lastName: "User",
      imageUrl: "https://example.com/memories.png",
    });
    process.env.INTERNAL_TASK_SECRET = "test-action-job-secret";
  });

  it("lists Postgres-backed memories with category and hybrid search filters", async () => {
    const users = createUserRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_memories",
      email: "memories@example.com",
      name: "Memory User",
      imageUrl: "https://example.com/memories.png",
    });

    await db.insert(memoryEmbeddings).values([
      {
        userId: user.id,
        content: "User prefers TypeScript for backend work",
        category: "preference",
        sourceMessageId: null,
        conversationId: null,
        embedding: [0.9, 0.1],
        searchDocument: "User prefers TypeScript for backend work",
        metadata: {
          importance: 9,
          confidence: 0.95,
          category: "preference",
        },
        createdAt: 100,
        updatedAt: 100,
      },
      {
        userId: user.id,
        content: "User is planning a gardening project",
        category: "project",
        sourceMessageId: null,
        conversationId: null,
        embedding: [0.1, 0.9],
        searchDocument: "User is planning a gardening project",
        metadata: {
          importance: 4,
          confidence: 0.7,
          category: "project",
        },
        createdAt: 200,
        updatedAt: 200,
      },
    ]);

    const { GET } = await import("../memories/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/v1/memories?category=preference&sortBy=importance&searchQuery=TypeScript",
        { method: "GET" },
      ) as any,
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data: Array<{ data: { _id: string; content: string } }>;
    };
    const results =
      unwrapData<
        Array<{
          data: {
            _id: string;
            content: string;
            metadata?: { category?: string; importance?: number };
          };
        }>
      >(json);
    expect(results).toHaveLength(1);
    expect(results[0]?.data).toMatchObject({
      content: "User prefers TypeScript for backend work",
      metadata: {
        category: "preference",
        importance: 9,
      },
    });
  });

  it("creates, deletes selected, and deletes all memories through v1 routes", async () => {
    const { POST, DELETE } = await import("../memories/route");
    const createResponse = await POST(
      createMockRequest("/api/v1/memories", {
        method: "POST",
        body: {
          content: "User likes concise answers",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const created = unwrapData<{
      _id: string;
      content: string;
    }>(
      (await createResponse.json()) as {
        status: string;
        data?: {
          _id: string;
          content: string;
        };
      },
    );
    expect(created.content).toBe("User likes concise answers");

    const deleteSelectedRoute = await import(
      "../memories/delete-selected/route"
    );
    const deleteSelectedResponse = await deleteSelectedRoute.POST(
      createMockRequest("/api/v1/memories/delete-selected", {
        method: "POST",
        body: {
          ids: [created._id],
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(deleteSelectedResponse.status).toBe(200);
    expect(
      unwrapData<{ deleted: number }>(
        (await deleteSelectedResponse.json()) as {
          status: string;
          data?: { deleted: number };
        },
      ),
    ).toMatchObject({ deleted: 1 });

    await POST(
      createMockRequest("/api/v1/memories", {
        method: "POST",
        body: {
          content: "User is building blah.chat",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const deleteAllResponse = await DELETE(
      createMockRequest("/api/v1/memories", {
        method: "DELETE",
      }),
      { params: Promise.resolve({}) },
    );

    expect(deleteAllResponse.status).toBe(200);
    expect(
      unwrapData<{ deleted: number }>(
        (await deleteAllResponse.json()) as {
          status: string;
          data?: { deleted: number };
        },
      ),
    ).toMatchObject({ deleted: 1 });
  });

  it("consolidates duplicate Postgres memories through the v1 route", async () => {
    const { POST } = await import("../memories/route");
    const createFirstResponse = await POST(
      createMockRequest("/api/v1/memories", {
        method: "POST",
        body: {
          content: "User prefers concise answers",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const createSecondResponse = await POST(
      createMockRequest("/api/v1/memories", {
        method: "POST",
        body: {
          content: "User prefers concise answers",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const first = unwrapData<{ _id: string }>(
      (await createFirstResponse.json()) as {
        status: string;
        data?: { _id: string };
      },
    );
    const second = unwrapData<{ _id: string }>(
      (await createSecondResponse.json()) as {
        status: string;
        data?: { _id: string };
      },
    );

    const consolidateRoute = await import("../memories/consolidate/route");
    const consolidateResponse = await consolidateRoute.POST(
      createMockRequest("/api/v1/memories/consolidate", {
        method: "POST",
        body: {
          ids: [first._id, second._id],
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(consolidateResponse.status).toBe(200);
    expect(
      unwrapData<{
        created: number;
        deleted: number;
        original: number;
        consolidated: number;
      }>(
        (await consolidateResponse.json()) as {
          status: string;
          data?: {
            created: number;
            deleted: number;
            original: number;
            consolidated: number;
          };
        },
      ),
    ).toMatchObject({
      created: 1,
      deleted: 1,
      original: 2,
      consolidated: 1,
    });
  });

  it("scans recent Postgres conversations and enqueues Trigger only for eligible chats", async () => {
    const users = createUserRepository(db);
    const conversations = createConversationRepository(db);
    const messages = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_memories",
      email: "memories@example.com",
      name: "Memory User",
      imageUrl: "https://example.com/memories.png",
    });

    const eligibleConversation = await conversations.create({
      userId: user.id,
      title: "Eligible chat",
      model: "openai:gpt-5",
    });

    const ineligibleConversation = await conversations.create({
      userId: user.id,
      title: "Too short",
      model: "openai:gpt-5",
    });

    await messages.create({
      conversationId: eligibleConversation.id,
      userId: user.id,
      role: "user",
      content: "one",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    await messages.create({
      conversationId: eligibleConversation.id,
      userId: user.id,
      role: "assistant",
      content: "two",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    await messages.create({
      conversationId: eligibleConversation.id,
      userId: user.id,
      role: "user",
      content: "three",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    await messages.create({
      conversationId: ineligibleConversation.id,
      userId: user.id,
      role: "user",
      content: "one",
      parentMessageIds: [],
      siblingIndex: 0,
    });
    await messages.create({
      conversationId: ineligibleConversation.id,
      userId: user.id,
      role: "assistant",
      content: "two",
      parentMessageIds: [],
      siblingIndex: 0,
    });

    const scanRecentRoute = await import("../memories/scan-recent/route");
    const response = await scanRecentRoute.POST(
      createMockRequest("/api/v1/memories/scan-recent", {
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(
      unwrapData<{ triggered: number }>(
        (await response.json()) as {
          status: string;
          data?: { triggered: number };
        },
      ),
    ).toMatchObject({ triggered: 1 });
    expect(triggerTaskMock).toHaveBeenCalledTimes(1);
    expect(triggerTaskMock).toHaveBeenCalledWith("extract-memories", {
      conversationId: eligibleConversation.id,
      userId: user.id,
    });
  });

  it("limits recent memory scans to the five most recently updated conversations", async () => {
    const users = createUserRepository(db);
    const conversationsRepo = createConversationRepository(db);
    const messagesRepo = createMessageRepository(db);

    const user = await users.upsertFromClerk({
      clerkId: "clerk_memories",
      email: "memories@example.com",
      name: "Memory User",
      imageUrl: "https://example.com/memories.png",
    });

    const createdConversations = await Promise.all(
      Array.from({ length: 6 }, async (_, index) => {
        const conversation = await conversationsRepo.create({
          userId: user.id,
          title: `Chat ${index + 1}`,
          model: "openai:gpt-5",
        });

        await db
          .update(conversations)
          .set({ updatedAt: index + 1 })
          .where(eq(conversations.id, conversation.id));

        await messagesRepo.create({
          conversationId: conversation.id,
          userId: user.id,
          role: "user",
          content: "one",
          parentMessageIds: [],
          siblingIndex: 0,
        });
        await messagesRepo.create({
          conversationId: conversation.id,
          userId: user.id,
          role: "assistant",
          content: "two",
          parentMessageIds: [],
          siblingIndex: 0,
        });
        await messagesRepo.create({
          conversationId: conversation.id,
          userId: user.id,
          role: "user",
          content: "three",
          parentMessageIds: [],
          siblingIndex: 0,
        });

        return conversation;
      }),
    );

    const scanRecentRoute = await import("../memories/scan-recent/route");
    const response = await scanRecentRoute.POST(
      createMockRequest("/api/v1/memories/scan-recent", {
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(
      unwrapData<{ triggered: number }>(
        (await response.json()) as {
          status: string;
          data?: { triggered: number };
        },
      ),
    ).toMatchObject({ triggered: 5 });
    expect(triggerTaskMock).toHaveBeenCalledTimes(5);
    expect(triggerTaskMock).not.toHaveBeenCalledWith("extract-memories", {
      conversationId: createdConversations[0]?.id,
      userId: user.id,
    });
  });

  it("starts manual extraction through Trigger without creating a Convex job", async () => {
    const users = createUserRepository(db);
    const conversationsRepo = createConversationRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_memories",
      email: "memories@example.com",
      name: "Memory User",
      imageUrl: "https://example.com/memories.png",
    });
    const conversation = await conversationsRepo.create({
      userId: user.id,
      title: "Manual extraction",
      model: "openai:gpt-5",
    });

    const { POST } = await import("../memories/extract/route");
    const response = await POST(
      createMockRequest("/api/v1/memories/extract", {
        method: "POST",
        body: {
          conversationId: conversation.id,
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(202);
    const data = unwrapData<{
      jobId: string;
      status: string;
      pollUrl: string;
    }>(
      (await response.json()) as {
        status: string;
        data?: {
          jobId: string;
          status: string;
          pollUrl: string;
        };
      },
    );
    expect(data).toMatchObject({
      status: "pending",
    });
    expect(data.jobId).toMatch(/^run_123\.[A-Za-z0-9_-]+$/);
    expect(data.pollUrl).toBe(`/api/v1/actions/jobs/${data.jobId}`);
    expect(triggerTaskMock).toHaveBeenCalledWith("extract-memories", {
      conversationId: conversation.id,
      userId: user.id,
    });
  });

  it("rejects manual extraction for conversations the user does not own", async () => {
    const { POST } = await import("../memories/extract/route");
    const response = await POST(
      createMockRequest("/api/v1/memories/extract", {
        method: "POST",
        body: {
          conversationId: "conv_other",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(404);
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("rate-limits manual memory extraction before creating a Trigger job", async () => {
    const users = createUserRepository(db);
    const conversationsRepo = createConversationRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_memories",
      email: "memories@example.com",
      name: "Memory User",
      imageUrl: "https://example.com/memories.png",
    });
    const conversation = await conversationsRepo.create({
      userId: user.id,
      title: "Rate limited extraction",
      model: "openai:gpt-5",
    });
    const limiter = { limit: vi.fn() };
    getLimiterMock.mockReturnValue(limiter);
    applyRateLimitMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "error" }), { status: 429 }),
    );

    const { POST } = await import("../memories/extract/route");
    const response = await POST(
      createMockRequest("/api/v1/memories/extract", {
        method: "POST",
        body: {
          conversationId: conversation.id,
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(429);
    expect(applyRateLimitMock).toHaveBeenCalledWith(limiter, "clerk_memories");
    expect(triggerTaskMock).not.toHaveBeenCalled();
  });

  it("maps Trigger run ids through the jobs status route", async () => {
    retrieveRunMock.mockResolvedValueOnce({
      id: "run_123",
      status: "COMPLETED",
      isQueued: false,
      isExecuting: false,
      isWaiting: false,
      isCompleted: true,
      isSuccess: true,
      isFailed: false,
      isCancelled: false,
      output: {
        extracted: 2,
      },
    });

    const signedJobId = signActionJobId("run_123", "clerk_memories");
    const { GET } = await import("../actions/jobs/[id]/route");
    const response = await GET(
      createMockRequest(`/api/v1/actions/jobs/${signedJobId}`),
      {
        params: Promise.resolve({ id: signedJobId }),
      },
    );

    expect(response.status).toBe(200);
    expect(
      unwrapData<{
        status: string;
        result?: {
          extracted: number;
        };
      }>(
        (await response.json()) as {
          status: string;
          data?: {
            status: string;
            result?: {
              extracted: number;
            };
          };
        },
      ),
    ).toMatchObject({
      status: "completed",
      result: {
        extracted: 2,
      },
    });
  });

  it("rejects unsigned Trigger run ids on the jobs status route", async () => {
    const { GET } = await import("../actions/jobs/[id]/route");
    const response = await GET(
      createMockRequest("/api/v1/actions/jobs/run_123"),
      {
        params: Promise.resolve({ id: "run_123" }),
      },
    );

    expect(response.status).toBe(404);
    expect(retrieveRunMock).not.toHaveBeenCalled();
  });
});
