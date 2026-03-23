/**
 * @vitest-environment node
 */
import { createUserRepository } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const currentUserMock = vi.fn();
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: currentUserMock,
}));

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("server-only", () => ({}));

describe("usersDAL", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    currentUserMock.mockResolvedValue({
      id: "clerk_users_dal",
      primaryEmailAddress: { emailAddress: "users@example.com" },
      fullName: "Users Dal",
      firstName: "Users",
      lastName: "Dal",
      imageUrl: "https://example.com/users.png",
    });
  });

  it("jit-creates the current Postgres user when missing", async () => {
    const { usersDAL } = await import("../users");

    const result = await usersDAL.getCurrentOrCreate("clerk_users_dal");
    const data = unwrapData<{
      _id: string;
      clerkId: string;
      email: string;
      name: string;
      imageUrl?: string;
    }>(result);

    expect(data).toMatchObject({
      clerkId: "clerk_users_dal",
      email: "users@example.com",
      name: "Users Dal",
      imageUrl: "https://example.com/users.png",
    });

    const persistedUser =
      await createUserRepository(db).findByClerkId("clerk_users_dal");

    expect(persistedUser?.id).toBe(data._id);
  });
});
