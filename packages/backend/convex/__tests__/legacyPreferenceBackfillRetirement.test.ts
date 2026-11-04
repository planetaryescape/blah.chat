import {
  defineSchema,
  defineTable,
  makeFunctionReference,
} from "convex/server";
import { v } from "convex/values";
import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { createTestUserData } from "../lib/test/factories";
import schema from "../schema";

// Only this fixture accepts the pre-flattening embedded shape. Production does not.
const legacySchema = defineSchema({
  ...schema.tables,
  users: defineTable({
    ...schema.tables.users.validator.fields,
    preferences: v.object({
      showSmartAssistant: v.boolean(),
      noteCategoryMode: v.string(),
      customNoteCategories: v.array(v.string()),
      theme: v.string(),
    }),
  }),
});

describe("historical preference backfill after retirement", () => {
  it.each([
    "backfillSingleUser",
    "backfillBatch",
  ])("preserves retired values through %s without restoring active writers", async (name) => {
    const t = convexTest(legacySchema);
    const preferences = {
      showSmartAssistant: false,
      noteCategoryMode: "ai-suggested",
      customNoteCategories: ["decision", "followup"],
      theme: "dark",
    };
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { ...createTestUserData(), preferences }),
    );
    const reference = makeFunctionReference<"mutation">(
      `migrations/006_user_preferences_backfill:${name}`,
    );
    const args = name === "backfillSingleUser" ? { userId } : { batchSize: 10 };
    await t.mutation(reference, args);
    await t.mutation(reference, args);
    const rows = await t.run((ctx) =>
      ctx.db.query("userPreferences").collect(),
    );
    expect(rows).toHaveLength(4);
    for (const [key, value] of Object.entries(preferences)) {
      expect(rows.find((row) => row.key === key)).toMatchObject({
        userId,
        key,
        value,
        category: key === "theme" ? "appearance" : "advanced",
      });
    }
  });
});
