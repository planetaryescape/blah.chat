import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import { createMockIdentity, createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const retiredPreferences = [
  ["showSmartAssistant", false],
  ["noteCategoryMode", "ai-suggested"],
  ["customNoteCategories", ["decision", "followup"]],
] as const;

describe("retired Smart Assistant preferences", () => {
  it.each(
    retiredPreferences,
  )("rejects stale writes for %s before changing stored preferences", async (key, value) => {
    const t = convexTest(schema);
    const identity = createMockIdentity();
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", createTestUserData({ clerkId: identity.subject })),
    );
    const asUser = t.withIdentity(identity);

    await t.run(async (ctx) => {
      await ctx.db.insert("userPreferences", {
        userId,
        category: "advanced",
        key,
        value,
        createdAt: 100,
        updatedAt: 100,
      });
    });

    const before = await t.run((ctx) =>
      ctx.db
        .query("userPreferences")
        .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
        .first(),
    );

    await expect(
      // @ts-expect-error - Exercise a stale request after API contraction.
      asUser.mutation(api.users.updatePreferences, {
        preferences: { [key]: value },
      }),
    ).rejects.toThrow();

    const after = await t.run((ctx) =>
      ctx.db
        .query("userPreferences")
        .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
        .first(),
    );

    expect(after).toEqual(before);
    // The retired row remains readable; retirement does not migrate history.
    const stored = await asUser.query(api.users.getUserPreference, { key });
    expect(stored).toEqual(value);
  });

  it("continues to write and read task, voice, theme, and memory preferences", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();
    await t.run((ctx) =>
      ctx.db.insert("users", createTestUserData({ clerkId: identity.subject })),
    );
    const asUser = t.withIdentity(identity);

    // @ts-ignore - Convex's generated API type exceeds TS depth in this test.
    await asUser.mutation(api.users.updatePreferences, {
      preferences: {
        showTasks: false,
        ttsEnabled: true,
        theme: "light",
        memoryExtractionLevel: "minimal",
      },
    });

    const preferences = await asUser.query(api.users.getAllUserPreferences, {});
    expect(preferences).toMatchObject({
      showTasks: false,
      ttsEnabled: true,
      theme: "light",
      memoryExtractionLevel: "minimal",
    });
  });
});
