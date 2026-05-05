/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  notes as notesTable,
} from "@blah-chat/persistence-postgres";
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

vi.mock("@trigger.dev/sdk", () => ({
  tasks: { trigger: vi.fn(() => Promise.resolve({ id: "trigger-id" })) },
}));

async function seedNote(opts: { clerkId: string; tags?: string[] }) {
  const users = createUserRepository(db);
  const user = await users.upsertFromClerk({
    clerkId: opts.clerkId,
    email: `${opts.clerkId}@example.com`,
    name: "Tag Tester",
  });
  const [note] = await db
    .insert(notesTable)
    .values({
      userId: user.id,
      title: "Test note",
      content: "Some note content for tagging",
      tags: opts.tags ?? [],
    })
    .returning();
  if (!note) throw new Error("seedNote: insert returned no row");
  return { user, note };
}

describe("notes tags route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    authMock.mockResolvedValue({
      userId: "clerk_notes_tags",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_notes_tags",
      primaryEmailAddress: { emailAddress: "tags@example.com" },
      fullName: "Tag Tester",
      firstName: "Tag",
      lastName: "Tester",
      imageUrl: null,
    });
  });

  it("POST adds a tag to an owned note", async () => {
    const { note } = await seedNote({
      clerkId: "clerk_notes_tags",
      tags: ["existing"],
    });
    const { POST } = await import("../notes/[id]/tags/route");
    const response = await POST(
      createMockRequest(`/api/v1/notes/${note.id}/tags`, {
        method: "POST",
        body: { tag: "newtag" },
      }),
      { params: Promise.resolve({ id: note.id }) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { tags?: string[] };
    };
    const data = unwrapData<{ tags?: string[] }>(json);
    expect(data.tags).toContain("existing");
    expect(data.tags).toContain("newtag");
  });

  it("DELETE removes a tag from an owned note via query string", async () => {
    const { note } = await seedNote({
      clerkId: "clerk_notes_tags",
      tags: ["keepme", "removeme"],
    });
    const { DELETE } = await import("../notes/[id]/tags/route");
    const response = await DELETE(
      createMockRequest(`/api/v1/notes/${note.id}/tags?tag=removeme`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: note.id }) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { tags?: string[] };
    };
    const data = unwrapData<{ tags?: string[] }>(json);
    expect(data.tags).toContain("keepme");
    expect(data.tags ?? []).not.toContain("removeme");
  });

  it("DELETE returns 400 when tag query parameter missing", async () => {
    const { note } = await seedNote({
      clerkId: "clerk_notes_tags",
      tags: ["x"],
    });
    const { DELETE } = await import("../notes/[id]/tags/route");
    const response = await DELETE(
      createMockRequest(`/api/v1/notes/${note.id}/tags`, { method: "DELETE" }),
      { params: Promise.resolve({ id: note.id }) },
    );

    expect(response.status).toBe(400);
  });
});
