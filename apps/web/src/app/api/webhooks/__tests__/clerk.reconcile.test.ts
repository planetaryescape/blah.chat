/**
 * @vitest-environment node
 */
import {
  createConversationRepository,
  createUserRepository,
  users,
} from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const verifyMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    const h = new Headers();
    h.set("svix-id", "id_123");
    h.set("svix-timestamp", "123456");
    h.set("svix-signature", "sig_123");
    return h;
  }),
}));

vi.mock("svix", () => ({
  Webhook: class MockWebhook {
    verify = verifyMock;
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("POST /api/webhooks/clerk reconciliation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    process.env.CLERK_WEBHOOK_SECRET = "secret";
  });

  it.each([
    "user.created",
    "user.updated",
  ])("reuses the existing same-email user for %s events", async (eventType) => {
    const usersRepo = createUserRepository(db);
    const conversationsRepo = createConversationRepository(db);
    const legacyUser = await usersRepo.upsertFromClerk({
      clerkId: "user_legacy",
      email: "reconcile@example.com",
      name: "Legacy User",
    });

    await conversationsRepo.create({
      userId: legacyUser.id,
      title: "Legacy History",
      model: "gpt-5",
    });

    verifyMock.mockReturnValue({
      type: eventType,
      data: {
        id: "user_current",
        email_addresses: [
          {
            id: "email_1",
            email_address: "reconcile@example.com",
          },
        ],
        primary_email_address_id: "email_1",
        first_name: "Current",
        last_name: "User",
        image_url: "https://example.com/current.png",
      },
    });

    const { POST } = await import("../clerk/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);

    const rows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${"reconcile@example.com"}`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: legacyUser.id,
      clerkId: "user_current",
      email: "reconcile@example.com",
      name: "Current User",
      imageUrl: "https://example.com/current.png",
    });
    expect(await usersRepo.findByClerkId("user_legacy")).toBeUndefined();
    expect(await usersRepo.findByClerkId("user_current")).toMatchObject({
      id: legacyUser.id,
    });
  });
});
