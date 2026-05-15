import { createUserRepository } from "@blah-chat/persistence-postgres";
import { describe, expect, it, vi } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import {
  RECONCILE_CLERK_USERS_CRON,
  reconcileClerkUsers,
} from "./reconcile-clerk-users";

function fakeClerkClient(map: Record<string, unknown>) {
  return {
    users: {
      getUser: vi.fn((id: string) => {
        const value = map[id];
        if (value instanceof Error) return Promise.reject(value);
        if (value === undefined) {
          const err = new Error("User not found") as Error & { status: number };
          err.status = 404;
          return Promise.reject(err);
        }
        return Promise.resolve(value);
      }),
    },
  };
}

const baseClerkUser = (overrides: Record<string, unknown>) => ({
  id: "clerk_default",
  primaryEmailAddress: { emailAddress: "default@example.com" },
  fullName: "Default User",
  firstName: "Default",
  lastName: "User",
  imageUrl: null,
  ...overrides,
});

describe("reconcileClerkUsers", () => {
  it("keeps the intended production schedule definition", () => {
    expect(RECONCILE_CLERK_USERS_CRON).toEqual({
      pattern: "0 4 * * *",
      timezone: "UTC",
      environments: ["PRODUCTION"],
    });
  });

  it("updates rows whose Clerk record changed and bumps clerkSyncedAt for unchanged ones", async () => {
    const db = await createTestPersistenceDb();
    const repo = createUserRepository(db);

    const stale = Date.now() - 10 * 24 * 60 * 60 * 1000;
    await repo.upsertFromClerk({
      clerkId: "clerk_changed",
      email: "old@example.com",
      name: "Old Name",
      clerkSyncedAt: stale,
    });
    await repo.upsertFromClerk({
      clerkId: "clerk_unchanged",
      email: "same@example.com",
      name: "Same Name",
      clerkSyncedAt: stale,
    });

    const clerk = fakeClerkClient({
      clerk_changed: baseClerkUser({
        id: "clerk_changed",
        primaryEmailAddress: { emailAddress: "new@example.com" },
        fullName: "New Name",
      }),
      clerk_unchanged: baseClerkUser({
        id: "clerk_unchanged",
        primaryEmailAddress: { emailAddress: "same@example.com" },
        fullName: "Same Name",
      }),
    });

    const now = Date.now();
    const result = await reconcileClerkUsers({ db, clerk, now: () => now });

    expect(result).toMatchObject({
      scanned: 2,
      updated: 1,
      deleted: 0,
      errors: 0,
    });

    const changed = await repo.findByClerkId("clerk_changed");
    expect(changed?.email).toBe("new@example.com");
    expect(changed?.name).toBe("New Name");

    const unchanged = await repo.findByClerkId("clerk_unchanged");
    expect(unchanged?.email).toBe("same@example.com");
    expect(unchanged?.clerkSyncedAt).toBe(now);
  });

  it("deletes users that Clerk no longer recognizes", async () => {
    const db = await createTestPersistenceDb();
    const repo = createUserRepository(db);
    await repo.upsertFromClerk({
      clerkId: "clerk_gone",
      email: "gone@example.com",
      name: "Gone User",
    });

    const clerk = fakeClerkClient({});
    const result = await reconcileClerkUsers({ db, clerk });

    expect(result).toMatchObject({ scanned: 1, deleted: 1, errors: 0 });
    expect(await repo.findByClerkId("clerk_gone")).toBeUndefined();
  });

  it("processes users in batches", async () => {
    const db = await createTestPersistenceDb();
    const repo = createUserRepository(db);
    const map: Record<string, unknown> = {};
    for (let i = 0; i < 5; i++) {
      const id = `clerk_batch_${i}`;
      await repo.upsertFromClerk({
        clerkId: id,
        email: `batch-${i}@example.com`,
        name: `Batch ${i}`,
        clerkSyncedAt: 1,
      });
      map[id] = baseClerkUser({
        id,
        primaryEmailAddress: { emailAddress: `batch-${i}@example.com` },
        fullName: `Batch ${i}`,
      });
    }
    const clerk = fakeClerkClient(map);

    const result = await reconcileClerkUsers({ db, clerk, batchSize: 2 });

    expect(result.scanned).toBe(5);
    expect(clerk.users.getUser).toHaveBeenCalledTimes(5);
  });

  it("continues after a single user errors", async () => {
    const db = await createTestPersistenceDb();
    const repo = createUserRepository(db);
    for (const i of [0, 1, 2]) {
      await repo.upsertFromClerk({
        clerkId: `clerk_err_${i}`,
        email: `err-${i}@example.com`,
        name: `Err ${i}`,
        clerkSyncedAt: 1,
      });
    }

    const transientFailure = new Error("Clerk API timeout");
    const clerk = fakeClerkClient({
      clerk_err_0: baseClerkUser({
        id: "clerk_err_0",
        primaryEmailAddress: { emailAddress: "err-0@example.com" },
        fullName: "Err 0",
      }),
      clerk_err_1: transientFailure,
      clerk_err_2: baseClerkUser({
        id: "clerk_err_2",
        primaryEmailAddress: { emailAddress: "err-2@example.com" },
        fullName: "Err 2",
      }),
    });

    const result = await reconcileClerkUsers({ db, clerk });
    expect(result.scanned).toBe(3);
    expect(result.errors).toBe(1);
    expect(await repo.findByClerkId("clerk_err_1")).toBeDefined();
  });
});
