import { describe, expect, it } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { internal } from "../_generated/api";
import { createTestUserData } from "../lib/test/factories";
import schema from "../schema";

describe("live synthesis claim admission", () => {
  it.each([
    { expired: 100, live: 0, allowed: true },
    { expired: 0, live: 100, allowed: false },
    { expired: 100, live: 100, allowed: false },
  ])("counts only unexpired owner claims: $expired expired, $live live", async ({
    expired,
    live,
    allowed,
  }) => {
    const t = convexTest(schema);
    const owner = await t.run(async (ctx) => {
      const userId = await ctx.db.insert(
        "users",
        createTestUserData({ clerkId: "claims-owner" }),
      );
      for (let index = 0; index < expired + live; index++) {
        await ctx.db.insert("ttsSynthesisClaims", {
          userId,
          hash: `existing-${index}`,
          claimToken: `token-${index}`,
          expiresAt: index < expired ? Date.now() - 1000 : Date.now() + 60_000,
        });
      }
      return userId;
    });
    expect(
      await t.mutation(internal.ttsCache.claimSynthesis, {
        userId: owner,
        hash: "new-hash",
        claimToken: "new-token",
      }),
    ).toBe(allowed);
    const created = await t.run((ctx) =>
      ctx.db
        .query("ttsSynthesisClaims")
        .withIndex("by_user_hash", (q) =>
          q.eq("userId", owner).eq("hash", "new-hash"),
        )
        .unique(),
    );
    if (allowed) {
      expect(created?.claimToken).toBe("new-token");
      expect(created?.expiresAt).toBeGreaterThan(Date.now() + 80_000);
    } else {
      expect(created).toBeNull();
    }
  });
});
