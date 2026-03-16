/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertFromClerk = vi.fn();
const deleteByClerkId = vi.fn();
const verify = vi.fn();

vi.mock("@blah-chat/persistence-postgres", () => ({
  createUserRepository: () => ({
    upsertFromClerk,
    deleteByClerkId,
  }),
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: vi.fn(() => ({})),
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
    verify = verify;
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

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "secret";
  });

  it("upserts a created user in Postgres", async () => {
    verify.mockReturnValue({
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [
          {
            id: "email_1",
            email_address: "test@example.com",
          },
        ],
        primary_email_address_id: "email_1",
        first_name: "Test",
        last_name: "User",
        image_url: "https://example.com/user.png",
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
    expect(upsertFromClerk).toHaveBeenCalledWith({
      clerkId: "user_123",
      email: "test@example.com",
      name: "Test User",
      imageUrl: "https://example.com/user.png",
    });
  });

  it("deletes a removed user from Postgres", async () => {
    verify.mockReturnValue({
      type: "user.deleted",
      data: {
        id: "user_123",
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
    expect(deleteByClerkId).toHaveBeenCalledWith("user_123");
  });
});
