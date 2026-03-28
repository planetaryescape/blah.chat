/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  notes,
  tasks,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
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

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");
  return {
    ...actual,
    parsePersistenceEnv: vi.fn(() => ({
      databaseUrl: "postgres://test:test@localhost/test",
      redis: { restUrl: "https://redis.test", restToken: "token" },
      r2: {
        accountId: "test",
        accessKeyId: "test",
        secretAccessKey: "test",
        bucket: "test",
        endpoint: "https://test.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: { secretKey: "tr_test", apiUrl: "https://api.trigger.dev" },
    })),
    createTriggerClient: vi.fn(() => ({
      triggerTask: vi.fn().mockResolvedValue({}),
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

describe("global notes/tasks auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_global",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_global",
      primaryEmailAddress: { emailAddress: "global@example.com" },
      fullName: "Global User",
      firstName: "Global",
      lastName: "User",
      imageUrl: "https://example.com/global.png",
      publicMetadata: {},
    });
  });

  it("creates, lists, updates, and deletes notes through global Postgres routes", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_global",
      email: "global@example.com",
      name: "Global User",
      imageUrl: "https://example.com/global.png",
    });

    const notesRoute = await import("../notes/route");
    const noteItemRoute = await import("../notes/[id]/route");

    const createResponse = await notesRoute.POST(
      createMockRequest("/api/v1/notes", {
        method: "POST",
        body: {
          title: "Inbox note",
          content: "Global note from Postgres",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createdNote = unwrapData<{
      _id: string;
      title: string;
      content: string;
    }>((await createResponse.json()) as any);
    expect(createdNote.title).toBe("Inbox note");

    const listResponse = await notesRoute.GET(
      createMockRequest("/api/v1/notes"),
      { params: Promise.resolve({}) },
    );

    expect(listResponse.status).toBe(200);
    const listedNotes = unwrapData<
      Array<{ data: { _id: string; title: string } }>
    >((await listResponse.json()) as any);
    expect(listedNotes).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          _id: createdNote._id,
          title: "Inbox note",
        }),
      }),
    ]);

    const patchResponse = await noteItemRoute.PATCH(
      createMockRequest(`/api/v1/notes/${createdNote._id}`, {
        method: "PATCH",
        body: {
          title: "Inbox note updated",
          isPinned: true,
        },
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(patchResponse.status).toBe(200);
    const updatedNote = unwrapData<{
      _id: string;
      title: string;
      isPinned: boolean;
    }>((await patchResponse.json()) as any);
    expect(updatedNote).toMatchObject({
      _id: createdNote._id,
      title: "Inbox note updated",
      isPinned: true,
    });

    const [persistedNote] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, createdNote._id));
    expect(persistedNote?.title).toBe("Inbox note updated");

    const deleteResponse = await noteItemRoute.DELETE(
      createMockRequest(`/api/v1/notes/${createdNote._id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(
      unwrapData<{ deleted: boolean; noteId: string }>(
        (await deleteResponse.json()) as any,
      ),
    ).toEqual({
      deleted: true,
      noteId: createdNote._id,
    });
  });

  it("creates, lists, updates, and deletes tasks through global Postgres routes", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_global",
      email: "global@example.com",
      name: "Global User",
      imageUrl: "https://example.com/global.png",
    });

    const tasksRoute = await import("../tasks/route");
    const taskItemRoute = await import("../tasks/[id]/route");

    const createResponse = await tasksRoute.POST(
      createMockRequest("/api/v1/tasks", {
        method: "POST",
        body: {
          title: "Global task",
          urgency: "medium",
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(createResponse.status).toBe(201);
    const createdTask = unwrapData<{
      _id: string;
      title: string;
      status: string;
    }>((await createResponse.json()) as any);
    expect(createdTask).toMatchObject({
      title: "Global task",
      status: "in_progress",
    });

    const listResponse = await tasksRoute.GET(
      createMockRequest("/api/v1/tasks"),
      { params: Promise.resolve({}) },
    );

    expect(listResponse.status).toBe(200);
    const listedTasks = unwrapData<
      Array<{ data: { _id: string; title: string } }>
    >((await listResponse.json()) as any);
    expect(listedTasks).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          _id: createdTask._id,
          title: "Global task",
        }),
      }),
    ]);

    const patchResponse = await taskItemRoute.PATCH(
      createMockRequest(`/api/v1/tasks/${createdTask._id}`, {
        method: "PATCH",
        body: {
          status: "completed",
          urgency: "high",
        },
      }),
      { params: Promise.resolve({ id: createdTask._id }) },
    );

    expect(patchResponse.status).toBe(200);
    const updatedTask = unwrapData<{
      _id: string;
      status: string;
      urgency: string;
      completedAt?: number;
    }>((await patchResponse.json()) as any);
    expect(updatedTask.status).toBe("completed");
    expect(updatedTask.urgency).toBe("high");
    expect(updatedTask.completedAt).toBeTypeOf("number");

    const [persistedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, createdTask._id));
    expect(persistedTask?.status).toBe("completed");

    const deleteResponse = await taskItemRoute.DELETE(
      createMockRequest(`/api/v1/tasks/${createdTask._id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: createdTask._id }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(
      unwrapData<{ deleted: boolean; taskId: string }>(
        (await deleteResponse.json()) as any,
      ),
    ).toEqual({
      deleted: true,
      taskId: createdTask._id,
    });
  });
});
