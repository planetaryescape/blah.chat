/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  documentRevisions,
  documents,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

type Envelope<T> = { status: string; data?: T };
type ErrorEnvelope = {
  status: string;
  error?: {
    code?: string;
    details?: {
      currentVersion?: number;
      currentContent?: string;
    };
  };
};

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
      triggerTask: vi.fn(),
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

describe("canvas history + restore (Postgres)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();

    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_canvas",
      email: "canvas@example.com",
      name: "Canvas User",
      imageUrl: "https://example.com/canvas.png",
    });

    authMock.mockResolvedValue({
      userId: "clerk_canvas",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_canvas",
      primaryEmailAddress: { emailAddress: "canvas@example.com" },
      fullName: "Canvas User",
      firstName: "Canvas",
      lastName: "User",
      imageUrl: "https://example.com/canvas.png",
      publicMetadata: {},
    });
  });

  async function createDoc() {
    const route = await import("../documents/route");
    const res = await route.POST(
      createMockRequest("/api/v1/documents", {
        method: "POST",
        body: { title: "Hello", content: "v1" },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    return unwrapData<{ _id: string; version: number }>(
      (await res.json()) as unknown as Envelope<{
        _id: string;
        version: number;
      }>,
    );
  }

  it("creating a document seeds an initial revision", async () => {
    const doc = await createDoc();
    const histRoute = await import("../documents/[id]/history/route");
    const res = await histRoute.GET(
      createMockRequest(`/api/v1/documents/${doc._id}/history`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );
    expect(res.status).toBe(200);
    const data = unwrapData<{ data: { version: number; content: string } }[]>(
      (await res.json()) as unknown as Envelope<
        { data: { version: number; content: string } }[]
      >,
    );
    expect(data.length).toBe(1);
    expect(data[0]?.data.version).toBe(1);
    expect(data[0]?.data.content).toBe("v1");
  });

  it("PATCH increments version and appends a revision", async () => {
    const doc = await createDoc();
    const docRoute = await import("../documents/[id]/route");
    const res = await docRoute.PATCH(
      createMockRequest(`/api/v1/documents/${doc._id}`, {
        method: "PATCH",
        body: { content: "v2", source: "user_edit" },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );
    expect(res.status).toBe(200);
    const updated = unwrapData<{ version: number; content: string }>(
      (await res.json()) as unknown as Envelope<{
        version: number;
        content: string;
      }>,
    );
    expect(updated.version).toBe(2);
    expect(updated.content).toBe("v2");

    const revs = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, doc._id));
    expect(revs.map((r) => r.version).sort()).toEqual([1, 2]);
  });

  it("PATCH with stale expectedVersion returns 409 + currentContent", async () => {
    const doc = await createDoc();
    const docRoute = await import("../documents/[id]/route");

    // First write — bumps to v2.
    await docRoute.PATCH(
      createMockRequest(`/api/v1/documents/${doc._id}`, {
        method: "PATCH",
        body: { content: "v2", source: "user_edit" },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );

    // Second write with the now-stale expectedVersion=1.
    const conflictRes = await docRoute.PATCH(
      createMockRequest(`/api/v1/documents/${doc._id}`, {
        method: "PATCH",
        body: {
          content: "v3-from-stale",
          expectedVersion: 1,
          source: "user_edit",
        },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );
    expect(conflictRes.status).toBe(409);
    const body = (await conflictRes.json()) as unknown as ErrorEnvelope;
    expect(body.status).toBe("error");
    expect(body.error?.code).toBe("version_conflict");
    expect(body.error?.details?.currentVersion).toBe(2);
    expect(body.error?.details?.currentContent).toBe("v2");

    // Confirm DB state was not mutated by the conflicting attempt.
    const docRow = await db.query.documents.findFirst({
      where: eq(documents.id, doc._id),
    });
    expect(docRow?.content).toBe("v2");
    expect(docRow?.version).toBe(2);
  });

  it("title-only PATCH does NOT append a content revision", async () => {
    const doc = await createDoc();
    const docRoute = await import("../documents/[id]/route");

    await docRoute.PATCH(
      createMockRequest(`/api/v1/documents/${doc._id}`, {
        method: "PATCH",
        body: { title: "Renamed", source: "user_edit" },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );

    const revs = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, doc._id));
    // Only the initial v1 revision; title-only edits skip history.
    expect(revs).toHaveLength(1);
    expect(revs[0].version).toBe(1);
  });

  it("restore creates a NEW revision with source=restore (non-destructive)", async () => {
    const doc = await createDoc();
    const docRoute = await import("../documents/[id]/route");

    await docRoute.PATCH(
      createMockRequest(`/api/v1/documents/${doc._id}`, {
        method: "PATCH",
        body: { content: "v2", source: "user_edit" },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );

    const initialRevs = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, doc._id))
      .orderBy(documentRevisions.version);
    const v1Rev = initialRevs.find((r) => r.version === 1);
    expect(v1Rev).toBeDefined();

    const restoreRoute = await import("../documents/[id]/restore/route");
    const res = await restoreRoute.POST(
      createMockRequest(`/api/v1/documents/${doc._id}/restore`, {
        method: "POST",
        body: { revisionId: v1Rev?.id },
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );
    expect(res.status).toBe(200);

    const docRow = await db.query.documents.findFirst({
      where: eq(documents.id, doc._id),
    });
    // Content reverted, but version monotonically increased.
    expect(docRow?.content).toBe("v1");
    expect(docRow?.version).toBe(3);

    const revs = await db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, doc._id))
      .orderBy(documentRevisions.version);
    expect(revs.map((r) => r.version)).toEqual([1, 2, 3]);
    expect(revs[2].source).toBe("restore");
  });

  it("history list rejects access for a different user (ownership)", async () => {
    const doc = await createDoc();

    // Now switch the auth context to a different user that does NOT own the doc.
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_other",
      email: "other@example.com",
      name: "Other",
      imageUrl: "https://example.com/o.png",
    });
    authMock.mockResolvedValue({
      userId: "clerk_other",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_other",
      primaryEmailAddress: { emailAddress: "other@example.com" },
      fullName: "Other",
      firstName: "Other",
      lastName: "User",
      imageUrl: "https://example.com/o.png",
      publicMetadata: {},
    });

    const histRoute = await import("../documents/[id]/history/route");
    const res = await histRoute.GET(
      createMockRequest(`/api/v1/documents/${doc._id}/history`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: doc._id }) },
    );
    // withErrorHandling maps the thrown "Document not found" into a 4xx envelope.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
