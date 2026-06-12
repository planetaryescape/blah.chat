/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  knowledgeSources,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const triggerTaskMock = vi.fn();
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
    createTriggerClient: vi.fn(() => ({
      ping: vi.fn(),
      triggerTask: triggerTaskMock,
      retrieveRun: vi.fn(),
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

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

describe("knowledge auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    triggerTaskMock.mockResolvedValue({ id: "run_knowledge" });

    authMock.mockResolvedValue({
      userId: "clerk_knowledge",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_knowledge",
      primaryEmailAddress: { emailAddress: "knowledge@example.com" },
      fullName: "Knowledge User",
      firstName: "Knowledge",
      lastName: "User",
      imageUrl: "https://example.com/knowledge.png",
      publicMetadata: {},
    });
  });

  it("creates, lists, gets, reprocesses, and deletes a Postgres knowledge source through v1 routes", async () => {
    const collectionRoute = await import("../knowledge/sources/route");
    const createResponse = await collectionRoute.POST(
      createMockRequest("/api/v1/knowledge/sources", {
        method: "POST",
        body: {
          type: "text",
          title: "Rewrite Notes",
          content: "Move long-running work to Trigger and Postgres.",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const created = unwrapData<{
      _id: string;
      type: string;
      status: string;
    }>((await createResponse.json()) as any);
    expect(created.type).toBe("text");
    expect(created.status).toBe("pending");
    expect(triggerTaskMock).toHaveBeenCalledWith(
      "process-source",
      { sourceId: created._id },
      { concurrencyKey: created._id },
    );

    const listResponse = await collectionRoute.GET(
      createMockRequest("/api/v1/knowledge/sources", {
        method: "GET",
      }),
      { params: Promise.resolve({}) },
    );
    expect(listResponse.status).toBe(200);
    const listed = unwrapData<Array<{ data: { _id: string } }>>(
      (await listResponse.json()) as any,
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.data._id).toBe(created._id);

    const detailRoute = await import("../knowledge/sources/[id]/route");
    const detailResponse = await detailRoute.GET(
      createMockRequest(`/api/v1/knowledge/sources/${created._id}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(detailResponse.status).toBe(200);
    expect(
      unwrapData<{ _id: string; title: string }>(
        (await detailResponse.json()) as any,
      ),
    ).toMatchObject({
      _id: created._id,
      title: "Rewrite Notes",
    });

    triggerTaskMock.mockClear();
    const reprocessRoute = await import(
      "../knowledge/sources/[id]/reprocess/route"
    );
    const reprocessResponse = await reprocessRoute.POST(
      createMockRequest(`/api/v1/knowledge/sources/${created._id}/reprocess`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(reprocessResponse.status).toBe(200);
    expect(triggerTaskMock).toHaveBeenCalledWith(
      "process-source",
      { sourceId: created._id },
      { concurrencyKey: created._id },
    );

    const deleteResponse = await detailRoute.DELETE(
      createMockRequest(`/api/v1/knowledge/sources/${created._id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created._id }) },
    );
    expect(deleteResponse.status).toBe(200);

    const deleted = await db.query.knowledgeSources.findFirst({
      where: eq(knowledgeSources.id, created._id),
    });
    expect(deleted).toBeUndefined();
  });

  it("creates file sources with the persisted storage key", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_knowledge",
      email: "knowledge@example.com",
      name: "Knowledge User",
      imageUrl: "https://example.com/knowledge.png",
    });

    const collectionRoute = await import("../knowledge/sources/route");
    const response = await collectionRoute.POST(
      createMockRequest("/api/v1/knowledge/sources", {
        method: "POST",
        body: {
          type: "file",
          title: "Spec.pdf",
          storageId: "users/user_1/drafts/spec.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(201);
    const created = unwrapData<{ _id: string }>((await response.json()) as any);
    const stored = await db.query.knowledgeSources.findFirst({
      where: eq(knowledgeSources.id, created._id),
    });
    expect(stored).toMatchObject({
      storageKey: "users/user_1/drafts/spec.pdf",
      mimeType: "application/pdf",
      size: 1024,
    });
  });
});
