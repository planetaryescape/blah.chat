import { describe, expect, it } from "vitest";
import { createMockIdentity, createTestUserData } from "@/lib/test/factories";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import schema from "../schema";

describe("convex/users", () => {
  describe("getCurrentUser query", () => {
    it("returns user for authenticated identity", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId: identity.subject,
            email: "test@example.com",
            name: "Test User",
          }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.users.getCurrentUser, {});

      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.name).toBe("Test User");
    });

    it("returns null for unauthenticated user", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await t.query(api.users.getCurrentUser, {});

      expect(result).toBeNull();
    });

    it("returns null when user not in database", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const result = await asUser.query(api.users.getCurrentUser, {});

      expect(result).toBeNull();
    });
  });

  describe("createUser mutation", () => {
    it("creates new user", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const userId = await t.mutation(api.users.createUser, {
        clerkId,
        email: "new@example.com",
        name: "New User",
      });

      expect(userId).toBeDefined();

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.clerkId).toBe(clerkId);
      expect(user?.email).toBe("new@example.com");
      expect(user?.name).toBe("New User");
    });

    it("returns existing user if clerkId already exists", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      const existingId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId,
            email: "existing@example.com",
            name: "Existing User",
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const userId = await t.mutation(api.users.createUser, {
        clerkId,
        email: "different@example.com",
        name: "Different Name",
      });

      expect(userId).toEqual(existingId);
    });

    it("stores optional imageUrl", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const userId = await t.mutation(api.users.createUser, {
        clerkId,
        email: "avatar@example.com",
        name: "Avatar User",
        imageUrl: "https://example.com/avatar.jpg",
      });

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user?.imageUrl).toBe("https://example.com/avatar.jpg");
    });
  });

  describe("updateUser mutation", () => {
    it("updates user email and name", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId,
            email: "old@example.com",
            name: "Old Name",
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await t.mutation(api.users.updateUser, {
        clerkId,
        email: "new@example.com",
        name: "New Name",
      });

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .first();
      });

      expect(user?.email).toBe("new@example.com");
      expect(user?.name).toBe("New Name");
    });

    it("throws error for non-existent user", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await expect(
        t.mutation(api.users.updateUser, {
          clerkId: "non-existent",
          email: "test@example.com",
        }),
      ).rejects.toThrow("User not found");
    });
  });

  describe("deleteUser mutation", () => {
    it("deletes user by clerkId", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      await t.run(async (ctx) => {
        await ctx.db.insert("users", createTestUserData({ clerkId }));
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await t.mutation(api.users.deleteUser, { clerkId });

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .first();
      });

      expect(user).toBeNull();
    });

    it("throws error for non-existent user", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await expect(
        t.mutation(api.users.deleteUser, { clerkId: "non-existent" }),
      ).rejects.toThrow("User not found");
    });
  });

  describe("getUserByClerkId query", () => {
    it("returns user by clerkId", async () => {
      const t = convexTest(schema);
      const clerkId = `clerk-${crypto.randomUUID()}`;

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({
            clerkId,
            email: "lookup@example.com",
          }),
        );
      });

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const user = await t.query(api.users.getUserByClerkId, { clerkId });

      expect(user?.email).toBe("lookup@example.com");
    });

    it("returns null for non-existent clerkId", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const user = await t.query(api.users.getUserByClerkId, {
        clerkId: "non-existent",
      });

      expect(user).toBeNull();
    });
  });

  describe("updatePreferences mutation", () => {
    it("updates theme preference", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.users.updatePreferences, {
        preferences: { theme: "dark" },
      });

      const pref = await t.run(async (ctx) => {
        return await ctx.db
          .query("userPreferences")
          .withIndex("by_user_key", (q) =>
            q.eq("userId", userId).eq("key", "theme"),
          )
          .first();
      });

      expect(pref?.value).toBe("dark");
    });

    it("throws for unauthenticated user", async () => {
      const t = convexTest(schema);

      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await expect(
        t.mutation(api.users.updatePreferences, {
          preferences: { theme: "dark" },
        }),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("setDefaultModel mutation", () => {
    it("sets default model preference", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      await asUser.mutation(api.users.setDefaultModel, {
        modelId: "anthropic:claude-3-5-sonnet",
      });

      const pref = await t.run(async (ctx) => {
        return await ctx.db
          .query("userPreferences")
          .withIndex("by_user_key", (q) =>
            q.eq("userId", userId).eq("key", "defaultModel"),
          )
          .first();
      });

      expect(pref?.value).toBe("anthropic:claude-3-5-sonnet");
    });
  });

  describe("getUserPreference query", () => {
    it("returns preference value for authenticated user", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        const userId = await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
        await ctx.db.insert("userPreferences", {
          userId,
          key: "theme",
          value: "light",
          category: "appearance",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const value = await asUser.query(api.users.getUserPreference, {
        key: "theme",
      });

      expect(value).toBe("light");
    });

    it("returns null for missing preference", async () => {
      const t = convexTest(schema);
      const identity = createMockIdentity();

      await t.run(async (ctx) => {
        await ctx.db.insert(
          "users",
          createTestUserData({ clerkId: identity.subject }),
        );
      });

      const asUser = t.withIdentity(identity);
      // @ts-ignore - Type instantiation too deep with 94+ Convex modules
      const value = await asUser.query(api.users.getUserPreference, {
        key: "nonexistent",
      });

      expect(value).toBeNull();
    });
  });
});
