import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import schema from "../schema";

describe("budget spend privacy", () => {
  it("denies anonymous, unregistered and foreign callers, including admins", async () => {
    const t = convexTest(schema);
    const owner = await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "foreign", isAdmin: true }),
      );
      return ctx.db.insert("users", createTestUserData({ clerkId: "owner" }));
    });
    for (const client of [
      t,
      t.withIdentity(createMockIdentity({ subject: "unregistered" })),
      t.withIdentity(createMockIdentity({ subject: "foreign" })),
    ]) {
      await expect(
        client.query(api.usage.checkBudget.checkBudget, { userId: owner }),
      ).rejects.toThrow(/Unauthorized/);
    }
  });

  it("preserves the owner's query arguments and spend response", async () => {
    const t = convexTest(schema);
    const owner = await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "owner" }),
      );
      await ctx.db.insert("usageRecords", {
        userId,
        date: new Date().toISOString().slice(0, 10),
        model: "test",
        inputTokens: 1,
        outputTokens: 1,
        messageCount: 1,
        cost: 4,
      });
      return userId;
    });
    const result = await t
      .withIdentity(createMockIdentity({ subject: "owner" }))
      .query(api.usage.checkBudget.checkBudget, { userId: owner });
    expect(result).toEqual({
      allowed: true,
      totalSpend: 4,
      budget: 10,
      percentUsed: 0.4,
      remaining: 6,
    });
  });
});
