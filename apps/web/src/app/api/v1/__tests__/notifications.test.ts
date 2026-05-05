/**
 * @vitest-environment node
 */
import {
  createUserRepository,
  notifications as notificationsTable,
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

async function seedNotification(
  userId: string,
  overrides: Partial<typeof notificationsTable.$inferInsert> = {},
) {
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId,
      type: "share_viewed",
      title: "Share viewed",
      message: "Someone opened your share link",
      data: { shareId: "share_1" },
      createdAt: Date.now(),
      ...overrides,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to seed notification");
  }
  return row;
}

describe("notifications routes", () => {
  let user: Awaited<
    ReturnType<ReturnType<typeof createUserRepository>["upsertFromClerk"]>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    user = await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_notif",
      email: "notif@example.com",
      name: "Notif Tester",
    });
    authMock.mockResolvedValue({
      userId: "clerk_notif",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_notif",
      primaryEmailAddress: { emailAddress: "notif@example.com" },
      fullName: "Notif Tester",
      firstName: "Notif",
      lastName: "Tester",
      imageUrl: null,
    });
  });

  it("GET lists notifications for the caller, newest first", async () => {
    await seedNotification(user.id, {
      title: "older",
      createdAt: Date.now() - 10_000,
    });
    await seedNotification(user.id, { title: "newer" });

    const { GET } = await import("../notifications/route");
    const response = await GET(createMockRequest("/api/v1/notifications"), {
      params: Promise.resolve({}),
    });
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { data: { title: string } }[];
    };
    expect(json.data).toHaveLength(2);
    expect(json.data?.[0]?.data.title).toBe("newer");
  });

  it("GET /count returns unread count", async () => {
    await seedNotification(user.id, { read: false });
    await seedNotification(user.id, {
      read: true,
      readAt: Date.now(),
    });
    const { GET } = await import("../notifications/count/route");
    const response = await GET(
      createMockRequest("/api/v1/notifications/count"),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { unreadCount: number };
    };
    const data = unwrapData<{ unreadCount: number }>(json);
    expect(data.unreadCount).toBe(1);
  });

  it("PATCH marks a notification read and stamps readAt", async () => {
    const row = await seedNotification(user.id, { read: false });
    const { PATCH } = await import("../notifications/[id]/route");
    const response = await PATCH(
      createMockRequest(`/api/v1/notifications/${row.id}`, {
        method: "PATCH",
        body: { read: true },
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(response.status).toBe(200);

    const dbRow = await db.query.notifications.findFirst({
      where: eq(notificationsTable.id, row.id),
    });
    expect(dbRow?.read).toBe(true);
    expect(dbRow?.readAt).toBeGreaterThan(0);
  });

  it("DELETE soft-dismisses by stamping dismissedAt", async () => {
    const row = await seedNotification(user.id);
    const { DELETE } = await import("../notifications/[id]/route");
    const response = await DELETE(
      createMockRequest(`/api/v1/notifications/${row.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(response.status).toBe(200);

    const dbRow = await db.query.notifications.findFirst({
      where: eq(notificationsTable.id, row.id),
    });
    expect(dbRow?.dismissedAt).toBeGreaterThan(0);
  });

  it("POST /mark-all-read flips every unread row read=true", async () => {
    await seedNotification(user.id, { read: false, title: "a" });
    await seedNotification(user.id, { read: false, title: "b" });
    await seedNotification(user.id, {
      read: true,
      readAt: Date.now(),
      title: "c",
    });

    const { POST } = await import("../notifications/mark-all-read/route");
    const response = await POST(
      createMockRequest("/api/v1/notifications/mark-all-read", {
        method: "POST",
      }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: { updatedCount: number };
    };
    const data = unwrapData<{ updatedCount: number }>(json);
    expect(data.updatedCount).toBe(2);

    const all = await db.select().from(notificationsTable);
    expect(all.every((row) => row.read)).toBe(true);
  });
});
