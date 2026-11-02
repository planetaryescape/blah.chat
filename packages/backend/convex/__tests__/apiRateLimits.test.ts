import { makeFunctionReference } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const consume = makeFunctionReference<"mutation">("apiRateLimits:consume");
const now = 2_000_000_000_000;
const hour = 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function fixture() {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => ({
    owner: await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "owner" }),
    ),
    foreign: await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: "foreign" }),
    ),
  }));
  return {
    t,
    ...ids,
    ownerClient: t.withIdentity(createMockIdentity({ subject: "owner" })),
    foreignClient: t.withIdentity(createMockIdentity({ subject: "foreign" })),
  };
}

describe("durable per-user API quotas", () => {
  it("accepts exactly one concurrent last-slot request and inserts no rejected events", async () => {
    const { t, owner, ownerClient } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 59; i++)
        await ctx.db.insert("rateLimitEvents", {
          userId: owner,
          operation: "regenerate",
          createdAt: now - 1,
        });
    });
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        ownerClient.mutation(consume, { operation: "regenerate" }),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(2);
    expect(
      await t.run((ctx) => ctx.db.query("rateLimitEvents").collect()),
    ).toHaveLength(60);
  });

  it("separates operations and users, rejects anonymous calls and caller-supplied user IDs", async () => {
    const { t, owner, foreign, ownerClient, foreignClient } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 60; i++)
        await ctx.db.insert("rateLimitEvents", {
          userId: owner,
          operation: "regenerate",
          createdAt: now,
        });
    });
    expect(
      await ownerClient.mutation(consume, { operation: "regenerate" }),
    ).toEqual({ allowed: false });
    expect(
      await ownerClient.mutation(consume, { operation: "hybrid-search" }),
    ).toEqual({ allowed: true });
    expect(
      await foreignClient.mutation(consume, { operation: "regenerate" }),
    ).toEqual({ allowed: true });
    await expect(
      t.mutation(consume, { operation: "regenerate" }),
    ).rejects.toThrow(/authenticated/);
    await expect(
      foreignClient.mutation(consume, {
        operation: "regenerate",
        userId: owner,
      }),
    ).rejects.toThrow();
    const rows = await t.run((ctx) =>
      ctx.db.query("rateLimitEvents").collect(),
    );
    expect(
      rows.filter(
        (row) => row.userId === owner && row.operation === "regenerate",
      ),
    ).toHaveLength(60);
    expect(rows.filter((row) => row.userId === foreign)).toHaveLength(1);
  });

  it("excludes the exact hour boundary and expires just-inside events when the clock advances", async () => {
    const { t, owner, ownerClient } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 59; i++)
        await ctx.db.insert("rateLimitEvents", {
          userId: owner,
          operation: "hybrid-search",
          createdAt: now - hour + 1,
        });
      for (const createdAt of [now - hour, now - hour - 1])
        await ctx.db.insert("rateLimitEvents", {
          userId: owner,
          operation: "hybrid-search",
          createdAt,
        });
    });
    expect(
      await ownerClient.mutation(consume, { operation: "hybrid-search" }),
    ).toEqual({ allowed: true });
    expect(
      await ownerClient.mutation(consume, { operation: "hybrid-search" }),
    ).toEqual({ allowed: false });
    expect(
      await t.run((ctx) => ctx.db.query("rateLimitEvents").collect()),
    ).toHaveLength(60);
    vi.setSystemTime(now + 1);
    expect(
      await ownerClient.mutation(consume, { operation: "hybrid-search" }),
    ).toEqual({ allowed: true });
    expect(
      await t.run((ctx) => ctx.db.query("rateLimitEvents").collect()),
    ).toHaveLength(2);
  });

  it("bounds expired-row cleanup to 100 and never cleans another user's events", async () => {
    const { t, owner, foreign, ownerClient } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 105; i++)
        await ctx.db.insert("rateLimitEvents", {
          userId: owner,
          operation: "regenerate",
          createdAt: now - hour,
        });
      await ctx.db.insert("rateLimitEvents", {
        userId: foreign,
        operation: "regenerate",
        createdAt: now - hour,
      });
    });
    expect(
      await ownerClient.mutation(consume, { operation: "regenerate" }),
    ).toEqual({ allowed: true });
    const rows = await t.run((ctx) =>
      ctx.db.query("rateLimitEvents").collect(),
    );
    expect(rows.filter((row) => row.userId === owner)).toHaveLength(6);
    expect(rows.filter((row) => row.userId === foreign)).toHaveLength(1);
  });

  it("cascades only the deleted user's quota events", async () => {
    const { t, owner, foreign, ownerClient, foreignClient } = await fixture();
    await ownerClient.mutation(consume, { operation: "regenerate" });
    await foreignClient.mutation(consume, { operation: "hybrid-search" });
    vi.stubEnv(
      "INTERNAL_API_SECRET",
      "synthetic-rate-limit-secret-32-characters",
    );
    await t.mutation(api.users.deleteUser, {
      clerkId: "owner",
      internalSecret: "synthetic-rate-limit-secret-32-characters",
    });
    const rows = await t.run((ctx) =>
      ctx.db.query("rateLimitEvents").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(foreign);
    expect(await t.run((ctx) => ctx.db.get(owner))).toBeNull();
  });
});
