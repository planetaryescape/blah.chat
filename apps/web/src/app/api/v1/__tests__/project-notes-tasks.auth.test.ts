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

describe("project notes/tasks auth with Clerk + Postgres", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_projects",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_projects",
      primaryEmailAddress: { emailAddress: "projects@example.com" },
      fullName: "Projects User",
      firstName: "Projects",
      lastName: "User",
      imageUrl: "https://example.com/projects.png",
      publicMetadata: {},
    });
  });

  it("creates, lists, updates, and deletes project notes through Postgres routes", async () => {
    const users = createUserRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_projects",
      email: "projects@example.com",
      name: "Projects User",
      imageUrl: "https://example.com/projects.png",
    });
    expect(user.id).toBeDefined();

    const notesRoute = await import("../projects/[id]/notes/route");
    const noteItemRoute = await import("../projects/[id]/notes/[noteId]/route");

    const createResponse = await notesRoute.POST(
      createMockRequest("/api/v1/projects/project_alpha/notes", {
        method: "POST",
        body: {
          title: "Rewrite note",
          content: "Move notes to Postgres",
          tags: ["postgres"],
        },
      }),
      { params: Promise.resolve({ id: "project_alpha" }) },
    );

    expect(createResponse.status).toBe(201);
    const createdNote = unwrapData<{
      _id: string;
      title: string;
      projectId: string;
      tags: string[];
    }>((await createResponse.json()) as any);
    expect(createdNote).toMatchObject({
      title: "Rewrite note",
      projectId: "project_alpha",
      tags: ["postgres"],
    });

    const listResponse = await notesRoute.GET(
      createMockRequest("/api/v1/projects/project_alpha/notes"),
      { params: Promise.resolve({ id: "project_alpha" }) },
    );

    expect(listResponse.status).toBe(200);
    const listedNotes = unwrapData<
      Array<{ data: { _id: string; title: string; projectId: string } }>
    >((await listResponse.json()) as any);
    expect(listedNotes).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          _id: createdNote._id,
          title: "Rewrite note",
          projectId: "project_alpha",
        }),
      }),
    ]);

    const patchResponse = await noteItemRoute.PATCH(
      createMockRequest(
        `/api/v1/projects/project_alpha/notes/${createdNote._id}`,
        {
          method: "PATCH",
          body: {
            title: "Rewrite note updated",
            content: "Moved to Postgres",
            isPinned: true,
          },
        },
      ),
      {
        params: Promise.resolve({
          id: "project_alpha",
          noteId: createdNote._id,
        }),
      },
    );

    expect(patchResponse.status).toBe(200);
    const updatedNote = unwrapData<{
      _id: string;
      title: string;
      content: string;
      isPinned: boolean;
    }>((await patchResponse.json()) as any);
    expect(updatedNote).toMatchObject({
      _id: createdNote._id,
      title: "Rewrite note updated",
      content: "Moved to Postgres",
      isPinned: true,
    });

    const [persistedNote] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, createdNote._id));
    expect(persistedNote?.projectId).toBe("project_alpha");

    const deleteResponse = await noteItemRoute.DELETE(
      createMockRequest(
        `/api/v1/projects/project_alpha/notes/${createdNote._id}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          id: "project_alpha",
          noteId: createdNote._id,
        }),
      },
    );

    expect(deleteResponse.status).toBe(200);
    const deletedNote = unwrapData<{ deleted: boolean; noteId: string }>(
      (await deleteResponse.json()) as any,
    );
    expect(deletedNote).toEqual({
      deleted: true,
      noteId: createdNote._id,
    });
  });

  it("creates, lists, updates, and deletes project tasks through Postgres routes", async () => {
    const users = createUserRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_projects",
      email: "projects@example.com",
      name: "Projects User",
      imageUrl: "https://example.com/projects.png",
    });
    expect(user.id).toBeDefined();

    const tasksRoute = await import("../projects/[id]/tasks/route");
    const taskItemRoute = await import("../projects/[id]/tasks/[taskId]/route");

    const createResponse = await tasksRoute.POST(
      createMockRequest("/api/v1/projects/project_alpha/tasks", {
        method: "POST",
        body: {
          title: "Ship rewrite",
          description: "Finish the migration",
          urgency: "high",
        },
      }),
      { params: Promise.resolve({ id: "project_alpha" }) },
    );

    expect(createResponse.status).toBe(201);
    const createdTask = unwrapData<{
      _id: string;
      title: string;
      projectId: string;
      status: string;
    }>((await createResponse.json()) as any);
    expect(createdTask).toMatchObject({
      title: "Ship rewrite",
      projectId: "project_alpha",
      status: "in_progress",
    });

    const listResponse = await tasksRoute.GET(
      createMockRequest("/api/v1/projects/project_alpha/tasks"),
      { params: Promise.resolve({ id: "project_alpha" }) },
    );

    expect(listResponse.status).toBe(200);
    const listedTasks = unwrapData<
      Array<{ data: { _id: string; title: string; projectId: string } }>
    >((await listResponse.json()) as any);
    expect(listedTasks).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          _id: createdTask._id,
          title: "Ship rewrite",
          projectId: "project_alpha",
        }),
      }),
    ]);

    const patchResponse = await taskItemRoute.PATCH(
      createMockRequest(
        `/api/v1/projects/project_alpha/tasks/${createdTask._id}`,
        {
          method: "PATCH",
          body: {
            status: "completed",
            urgency: "urgent",
          },
        },
      ),
      {
        params: Promise.resolve({
          id: "project_alpha",
          taskId: createdTask._id,
        }),
      },
    );

    expect(patchResponse.status).toBe(200);
    const updatedTask = unwrapData<{
      _id: string;
      status: string;
      urgency: string;
      completedAt?: number;
    }>((await patchResponse.json()) as any);
    expect(updatedTask.status).toBe("completed");
    expect(updatedTask.urgency).toBe("urgent");
    expect(updatedTask.completedAt).toBeTypeOf("number");

    const [persistedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, createdTask._id));
    expect(persistedTask?.projectId).toBe("project_alpha");

    const deleteResponse = await taskItemRoute.DELETE(
      createMockRequest(
        `/api/v1/projects/project_alpha/tasks/${createdTask._id}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          id: "project_alpha",
          taskId: createdTask._id,
        }),
      },
    );

    expect(deleteResponse.status).toBe(200);
    const deletedTask = unwrapData<{ deleted: boolean; taskId: string }>(
      (await deleteResponse.json()) as any,
    );
    expect(deletedTask).toEqual({
      deleted: true,
      taskId: createdTask._id,
    });
  });
});
