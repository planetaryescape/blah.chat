/**
 * @vitest-environment node
 */
import { createUserRepository } from "@blah-chat/persistence-postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../../../../packages/persistence-postgres/src/testing/pglite";

const getUserMock = vi.fn();
const currentUserMock = vi.fn();
const clerkClientMock = vi.fn(async () => ({
  users: { getUser: getUserMock },
}));
const afterCallbacks: Array<() => Promise<void> | void> = [];
const afterMock = vi.fn((cb: () => Promise<void> | void) => {
  afterCallbacks.push(cb);
});

// currentUser defaults to returning null — simulates the bug we're fixing
// (Clerk session not yet propagated). Tests opt in to a populated value when
// they want to exercise the fast path.
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
  currentUser: currentUserMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
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

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => testDb,
}));

let testDb: Awaited<ReturnType<typeof createTestPersistenceDb>>;

async function drainAfter() {
  while (afterCallbacks.length > 0) {
    const cb = afterCallbacks.shift();
    if (cb) await cb();
  }
}

const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const baseClerkUser = {
  id: "user_clerk",
  primaryEmailAddress: { emailAddress: "fresh@example.com" },
  fullName: "Fresh User",
  firstName: "Fresh",
  lastName: "User",
  imageUrl: "https://example.com/fresh.png",
};

describe("ensureCurrentPersistenceUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    currentUserMock.mockResolvedValue(null);
    testDb = await createTestPersistenceDb();
  });

  afterEach(() => {
    afterCallbacks.length = 0;
  });

  it("returns the DB row without calling Clerk on hit", async () => {
    const repo = createUserRepository(testDb);
    const seeded = await repo.upsertFromClerk({
      clerkId: "user_hit",
      email: "hit@example.com",
      name: "Hit User",
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    const result = await ensureCurrentPersistenceUser("user_hit");

    expect(result.id).toBe(seeded.id);
    expect(result.email).toBe("hit@example.com");
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("falls back to clerkClient.users.getUser when DB has no row", async () => {
    getUserMock.mockResolvedValue({
      ...baseClerkUser,
      id: "user_miss",
      primaryEmailAddress: { emailAddress: "miss@example.com" },
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    const result = await ensureCurrentPersistenceUser("user_miss");

    expect(getUserMock).toHaveBeenCalledWith("user_miss");
    expect(result.email).toBe("miss@example.com");

    const persisted =
      await createUserRepository(testDb).findByClerkId("user_miss");
    expect(persisted?.email).toBe("miss@example.com");
  });

  it("throws UserSyncError when both DB and Clerk lack the user", async () => {
    const cause = new Error("Clerk: User not found");
    getUserMock.mockRejectedValue(cause);

    const { ensureCurrentPersistenceUser, UserSyncError } = await import(
      "../current-user"
    );
    await expect(
      ensureCurrentPersistenceUser("user_nowhere"),
    ).rejects.toBeInstanceOf(UserSyncError);
  });

  it("populates email/name/imageUrl from Clerk on first sync", async () => {
    getUserMock.mockResolvedValue({
      ...baseClerkUser,
      id: "user_new",
      primaryEmailAddress: { emailAddress: "new@example.com" },
      fullName: "New Person",
      imageUrl: "https://example.com/new.png",
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    await ensureCurrentPersistenceUser("user_new");

    const persisted =
      await createUserRepository(testDb).findByClerkId("user_new");
    expect(persisted?.email).toBe("new@example.com");
    expect(persisted?.name).toBe("New Person");
    expect(persisted?.imageUrl).toBe("https://example.com/new.png");
  });

  it("triggers a background DB update when JWT claims drift from the row", async () => {
    const repo = createUserRepository(testDb);
    await repo.upsertFromClerk({
      clerkId: "user_drift",
      email: "old@example.com",
      name: "Old Name",
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    const returned = await ensureCurrentPersistenceUser("user_drift", {
      sessionClaims: {
        email: "new@example.com",
        name: "New Name",
        imageUrl: "https://example.com/new.png",
      },
    });

    // Returned row reflects the OLD state (sync is background).
    expect(returned.email).toBe("old@example.com");

    await drainAfter();

    const updated = await repo.findByClerkId("user_drift");
    expect(updated?.email).toBe("new@example.com");
    expect(updated?.name).toBe("New Name");
    expect(updated?.imageUrl).toBe("https://example.com/new.png");
  });

  it("triggers a background TTL refresh when clerkSyncedAt is older than 7 days", async () => {
    const repo = createUserRepository(testDb);
    await repo.upsertFromClerk({
      clerkId: "user_stale",
      email: "stale@example.com",
      name: "Stale User",
      clerkSyncedAt: Date.now() - STALE_TTL_MS - 60_000,
    });

    getUserMock.mockResolvedValue({
      ...baseClerkUser,
      id: "user_stale",
      primaryEmailAddress: { emailAddress: "fresh@example.com" },
      fullName: "Fresh Name",
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    await ensureCurrentPersistenceUser("user_stale");
    await drainAfter();

    const refreshed = await repo.findByClerkId("user_stale");
    expect(refreshed?.email).toBe("fresh@example.com");
    expect(refreshed?.name).toBe("Fresh Name");
    expect(refreshed?.clerkSyncedAt ?? 0).toBeGreaterThan(Date.now() - 60_000);
  });

  it("does no background work when row is fresh and claims match", async () => {
    const repo = createUserRepository(testDb);
    await repo.upsertFromClerk({
      clerkId: "user_fresh",
      email: "fresh@example.com",
      name: "Fresh User",
      imageUrl: "https://example.com/fresh.png",
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    await ensureCurrentPersistenceUser("user_fresh", {
      sessionClaims: {
        email: "fresh@example.com",
        name: "Fresh User",
        imageUrl: "https://example.com/fresh.png",
      },
    });
    await drainAfter();

    expect(getUserMock).not.toHaveBeenCalled();
    expect(clerkClientMock).not.toHaveBeenCalled();
  });

  it("tolerates concurrent first-request upserts via onConflictDoUpdate", async () => {
    getUserMock.mockResolvedValue({
      ...baseClerkUser,
      id: "user_race",
      primaryEmailAddress: { emailAddress: "race@example.com" },
    });

    const { ensureCurrentPersistenceUser } = await import("../current-user");
    const [a, b] = await Promise.all([
      ensureCurrentPersistenceUser("user_race"),
      ensureCurrentPersistenceUser("user_race"),
    ]);

    expect(a.id).toBe(b.id);
    const allRaceRows = await testDb.query.users.findMany({
      where: (u, { eq }) => eq(u.clerkId, "user_race"),
    });
    expect(allRaceRows).toHaveLength(1);
  });
});
