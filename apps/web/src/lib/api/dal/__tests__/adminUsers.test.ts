/**
 * @vitest-environment node
 */
import { userAdminSettings, users } from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const getUserMock = vi.fn();
const updateUserMetadataMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: getUserMock,
      updateUserMetadata: updateUserMetadataMock,
    },
  })),
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/utils/formatEntity", () => ({
  formatEntity: (data: unknown) => ({ status: "success", data }),
  formatEntityList: (data: unknown) => ({ status: "success", data }),
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

function unwrapData<T>(response: { status: string; data?: T }) {
  expect(response.status).toBe("success");
  return response.data as T;
}

describe("adminUsersDAL", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    await db.insert(users).values({
      id: "user_1",
      clerkId: "clerk_user_1",
      email: "user@example.com",
      name: "Example User",
      imageUrl: "https://example.com/avatar.png",
      createdAt: 1,
      updatedAt: 1,
    });
  });

  it("hydrates a single user from Clerk when admin settings are missing", async () => {
    getUserMock.mockResolvedValue({
      publicMetadata: {
        isAdmin: true,
        tier: "tier2",
      },
    });

    const { adminUsersDAL } = await import("../adminUsers");

    const result = await adminUsersDAL.getUser("user_1");
    const data = unwrapData<{
      _id: string;
      isAdmin: boolean;
      tier: "free" | "tier1" | "tier2";
    }>(result);

    expect(data).toMatchObject({
      _id: "user_1",
      isAdmin: true,
      tier: "tier2",
    });

    const persisted = await db.query.userAdminSettings.findFirst({
      where: eq(userAdminSettings.userId, "user_1"),
    });

    expect(persisted).toMatchObject({
      userId: "user_1",
      isAdmin: true,
      tier: "tier2",
    });
  });

  it("defaults invalid Clerk tier metadata to free", async () => {
    getUserMock.mockResolvedValue({
      publicMetadata: {
        isAdmin: true,
        tier: "pro",
      },
    });

    const { adminUsersDAL } = await import("../adminUsers");

    const result = await adminUsersDAL.getUser("user_1");
    const data = unwrapData<{
      isAdmin: boolean;
      tier: "free" | "tier1" | "tier2";
    }>(result);

    expect(data).toMatchObject({
      isAdmin: true,
      tier: "free",
    });
  });

  it("does not block listUsers on Clerk reconciliation", async () => {
    getUserMock.mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally unresolved: listUsers should not await this.
        }),
    );

    const { adminUsersDAL } = await import("../adminUsers");

    await expect(adminUsersDAL.listUsers()).resolves.toMatchObject({
      status: "success",
    });
  });
});
