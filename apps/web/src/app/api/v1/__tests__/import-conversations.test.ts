/**
 * @vitest-environment node
 */
import {
  conversations as conversationsTable,
  createUserRepository,
  messages as messagesTable,
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

describe("import conversations route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
    await createUserRepository(db).upsertFromClerk({
      clerkId: "clerk_import",
      email: "import@example.com",
      name: "Import Tester",
    });
    authMock.mockResolvedValue({
      userId: "clerk_import",
      getToken: vi.fn(() => Promise.resolve(null)),
    });
    currentUserMock.mockResolvedValue({
      id: "clerk_import",
      primaryEmailAddress: { emailAddress: "import@example.com" },
      fullName: "Import Tester",
      firstName: "Import",
      lastName: "Tester",
      imageUrl: null,
    });
  });

  it("imports a batch of conversations with messages", async () => {
    const { POST } = await import("../import/conversations/route");
    const response = await POST(
      createMockRequest("/api/v1/import/conversations", {
        method: "POST",
        body: {
          conversations: [
            {
              title: "Imported A",
              model: "openai/gpt-5",
              messages: [
                { role: "user", content: "hello" },
                { role: "assistant", content: "hi there" },
              ],
            },
            {
              title: "Imported B",
              messages: [{ role: "user", content: "second" }],
            },
          ],
        },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      data?: {
        success: boolean;
        importedCount: number;
        conversationIds: string[];
        errors: unknown[];
      };
    };
    const data = unwrapData<{
      success: boolean;
      importedCount: number;
      conversationIds: string[];
      errors?: unknown[];
    }>(json);

    expect(data.success).toBe(true);
    expect(data.importedCount).toBe(2);
    expect(data.conversationIds).toHaveLength(2);
    expect(data.errors ?? []).toHaveLength(0);

    const allConversations = await db.select().from(conversationsTable);
    expect(allConversations.map((c) => c.title).sort()).toEqual([
      "Imported A",
      "Imported B",
    ]);

    const firstConvId = data.conversationIds[0];
    if (!firstConvId) throw new Error("expected at least one imported id");
    const firstConvMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, firstConvId));
    expect(firstConvMessages).toHaveLength(2);
  });

  it("rejects empty conversations payload with 400", async () => {
    const { POST } = await import("../import/conversations/route");
    const response = await POST(
      createMockRequest("/api/v1/import/conversations", {
        method: "POST",
        body: { conversations: [] },
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
