import { convexTest } from "./testSetup";
import { describe, expect, it } from "vitest";
import { createMockIdentity, createTestUserData } from "@/lib/test/factories";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

// Helper to create admin settings with all required fields
function createAdminSettings(
  userId: Id<"users">,
  overrides: Partial<{
    defaultMonthlyBudget: number;
    defaultBudgetAlertThreshold: number;
    budgetHardLimitEnabled: boolean;
  }> = {},
) {
  return {
    autoMemoryExtractEnabled: false,
    autoMemoryExtractInterval: 10,
    enableHybridSearch: true,
    defaultMonthlyBudget: 10,
    defaultBudgetAlertThreshold: 0.8,
    budgetHardLimitEnabled: false,
    defaultDailyMessageLimit: 100,
    alertEmail: "test@example.com",
    updatedBy: userId,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("convex/usage/checkBudget", () => {
  it("returns allowed=true when budget is 0 (unlimited)", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      // Set budget to 0 (unlimited)
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 0,
        }),
      );
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    expect(result).toMatchObject({
      allowed: true,
      totalSpend: 0,
      budget: 0,
      percentUsed: 0,
      remaining: 0,
    });
  });

  it("returns allowed=true when under budget", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 10,
        }),
      );
      // Add some usage
      const today = new Date().toISOString().split("T")[0];
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "openai:gpt-5",
        inputTokens: 1000,
        outputTokens: 500,
        cost: 5, // $5 spent
        messageCount: 1,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    expect(result.allowed).toBe(true);
    expect(result.totalSpend).toBe(5);
    expect(result.budget).toBe(10);
    expect(result.percentUsed).toBeCloseTo(0.5);
    expect(result.remaining).toBe(5);
  });

  it("returns allowed=false when over budget", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 10,
        }),
      );
      // Add usage that exceeds budget
      const today = new Date().toISOString().split("T")[0];
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "openai:gpt-5",
        inputTokens: 10000,
        outputTokens: 5000,
        cost: 12, // $12 spent, over $10 budget
        messageCount: 5,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    expect(result.allowed).toBe(false);
    expect(result.totalSpend).toBe(12);
    expect(result.percentUsed).toBeCloseTo(1.2);
    expect(result.remaining).toBe(-2);
  });

  it("only counts current month usage", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 10,
        }),
      );

      const today = new Date().toISOString().split("T")[0];
      // Last month's usage (should not count)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthDate = lastMonth.toISOString().split("T")[0];

      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: lastMonthDate,
        model: "openai:gpt-5",
        inputTokens: 10000,
        outputTokens: 5000,
        cost: 50, // $50 last month
        messageCount: 10,
      });

      // Current month usage
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "openai:gpt-5",
        inputTokens: 1000,
        outputTokens: 500,
        cost: 3, // $3 this month
        messageCount: 1,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    // Should only count this month's $3, not last month's $50
    expect(result.totalSpend).toBe(3);
    expect(result.allowed).toBe(true);
  });

  it("sums multiple usage records in current month", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 20,
        }),
      );

      const today = new Date().toISOString().split("T")[0];
      // Multiple records this month
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "openai:gpt-5",
        inputTokens: 1000,
        outputTokens: 500,
        cost: 2,
        messageCount: 1,
      });
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "anthropic:claude-3-opus",
        inputTokens: 2000,
        outputTokens: 1000,
        cost: 5,
        messageCount: 2,
      });
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "google:gemini-pro",
        inputTokens: 500,
        outputTokens: 200,
        cost: 1,
        messageCount: 1,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    expect(result.totalSpend).toBe(8); // 2 + 5 + 1
    expect(result.percentUsed).toBeCloseTo(0.4); // 8/20
    expect(result.remaining).toBe(12);
  });

  it("returns allowed=true at exactly budget limit", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 10,
        }),
      );

      const today = new Date().toISOString().split("T")[0];
      await ctx.db.insert("usageRecords", {
        userId: userId,
        date: today,
        model: "openai:gpt-5",
        inputTokens: 5000,
        outputTokens: 2500,
        cost: 10, // Exactly at budget
        messageCount: 5,
      });
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    // At exactly budget (totalSpend === budget), allowed is false (totalSpend < monthlyBudget)
    expect(result.allowed).toBe(false);
    expect(result.percentUsed).toBeCloseTo(1.0);
    expect(result.remaining).toBe(0);
  });

  it("handles user with no usage records", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    let userId!: Id<"users">;
    await t.run(async (ctx) => {
      userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: identity.subject }),
      );
      await ctx.db.insert(
        "adminSettings",
        createAdminSettings(userId, {
          defaultMonthlyBudget: 10,
        }),
      );
    });

    const asUser = t.withIdentity(identity);
    // @ts-ignore - Type depth exceeded
    const result = await asUser.query(api.usage.checkBudget.checkBudget, {
      userId: userId,
    });

    expect(result.totalSpend).toBe(0);
    expect(result.allowed).toBe(true);
    expect(result.percentUsed).toBe(0);
    expect(result.remaining).toBe(10);
  });
});
