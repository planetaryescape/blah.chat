# Phase 3: Convex Function Unit Tests

**Priority:** P1 (High)
**Estimated Effort:** 4-5 hours
**Prerequisites:** Phase 1 (vitest.config.ts, factories.ts)

---

## Context

blah.chat's backend logic lives in Convex functions (`convex/*.ts`). These include:
- **Queries** - Read operations with auth checks
- **Mutations** - Write operations with validation
- **Actions** - Long-running ops (LLM calls, external APIs)
- **Internal functions** - Server-to-server helpers

This phase tests the business logic in isolation, mocking the database and auth.

---

## What Already Exists (REUSE)

| Asset | Location | Purpose |
|-------|----------|---------|
| `getCurrentUser` | `convex/lib/userSync.ts` | Auth helper (query) |
| `getCurrentUserOrCreate` | `convex/lib/userSync.ts` | Auth helper (mutation) |
| Convex validators (`v.*`) | `convex/schema.ts` | Arg validation |
| `Doc<T>`, `Id<T>` types | `@/convex/_generated/dataModel` | Type definitions |
| factories.ts from Phase 1 | `src/lib/test/factories.ts` | Mock data |

---

## What This Phase Creates

```
convex/__tests__/
├── conversations.test.ts    # Conversation queries/mutations
├── messages.test.ts         # Message queries/mutations
├── cascade.test.ts          # Cascade delete logic
├── helpers.ts               # Test utilities for Convex
docs/testing/
└── phase-3-convex.md        # This document
```

---

## Testing Approach: convex-test

Convex provides an official testing package that simulates the Convex runtime:

```bash
# Already installed in Phase 1
bun add -d convex-test
```

**Key features:**
- Mock database with real schema validation
- Mock auth identity
- Test queries, mutations, actions
- Isolated test environment

---

## Step-by-Step Implementation

### Step 1: Create Test Helpers

```typescript
// convex/__tests__/helpers.ts
//
// Test utilities for Convex functions
// Reuses existing project types

import { convexTest } from "convex-test";
import type { Id, Doc } from "../_generated/dataModel";
import schema from "../schema";

// Create test environment with schema validation
export function createTestEnv() {
  return convexTest(schema);
}

// Mock user identity (Clerk)
export function mockUserIdentity(clerkId: string = "test-clerk-id") {
  return {
    subject: clerkId,
    email: "test@example.com",
    fullName: "Test User",
    imageUrl: "https://example.com/avatar.png",
  };
}

// Factory: Create test user directly in DB
export async function createTestUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<Doc<"users">> = {}
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: `test-clerk-${Date.now()}`,
      email: "test@example.com",
      name: "Test User",
      dailyMessageCount: 0,
      lastMessageDate: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

// Factory: Create test conversation
export async function createTestConversation(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  overrides: Partial<Doc<"conversations">> = {}
): Promise<Id<"conversations">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("conversations", {
      userId,
      title: "Test Conversation",
      model: "gpt-4o",
      isPinned: false,
      isArchived: false,
      isStarred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

// Factory: Create test message
export async function createTestMessage(
  t: ReturnType<typeof convexTest>,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
  overrides: Partial<Doc<"messages">> = {}
): Promise<Id<"messages">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("messages", {
      conversationId,
      userId,
      role: "user",
      content: "Test message",
      status: "complete",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}
```

### Step 2: Create Conversation Tests

```typescript
// convex/__tests__/conversations.test.ts
//
// Tests for convex/conversations.ts queries and mutations

import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import {
  createTestEnv,
  mockUserIdentity,
  createTestUser,
  createTestConversation,
} from "./helpers";

describe("convex/conversations", () => {
  let t: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    t = createTestEnv();
  });

  describe("list query", () => {
    it("returns empty array when no conversations", async () => {
      const result = await t.query(api.conversations.list, {})
        .withIdentity(mockUserIdentity());

      expect(result).toEqual([]);
    });

    it("returns only user's conversations", async () => {
      // Create user and conversation
      const userId = await createTestUser(t, { clerkId: "user-1" });
      await createTestConversation(t, userId, { title: "My Chat" });

      // Create another user's conversation
      const otherUserId = await createTestUser(t, { clerkId: "user-2" });
      await createTestConversation(t, otherUserId, { title: "Other Chat" });

      // Query as first user
      const result = await t.query(api.conversations.list, {})
        .withIdentity(mockUserIdentity("user-1"));

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("My Chat");
    });

    it("excludes archived by default", async () => {
      const userId = await createTestUser(t);
      await createTestConversation(t, userId, { isArchived: false, title: "Active" });
      await createTestConversation(t, userId, { isArchived: true, title: "Archived" });

      const result = await t.query(api.conversations.list, {})
        .withIdentity(mockUserIdentity());

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active");
    });

    it("includes archived when flag set", async () => {
      const userId = await createTestUser(t);
      await createTestConversation(t, userId, { isArchived: true });

      const result = await t.query(api.conversations.list, { archived: true })
        .withIdentity(mockUserIdentity());

      expect(result).toHaveLength(1);
    });

    it("returns null for unauthenticated users", async () => {
      // No identity
      const result = await t.query(api.conversations.list, {});

      expect(result).toEqual([]);
    });
  });

  describe("create mutation", () => {
    it("creates conversation for authenticated user", async () => {
      // Ensure user exists
      await createTestUser(t, { clerkId: "test-clerk-id" });

      const result = await t.mutation(api.conversations.create, {
        model: "gpt-4o",
        title: "New Chat",
      }).withIdentity(mockUserIdentity());

      expect(result).toBeDefined();

      // Verify in database
      const conversation = await t.run(async (ctx) => {
        return await ctx.db.get(result);
      });

      expect(conversation?.model).toBe("gpt-4o");
      expect(conversation?.title).toBe("New Chat");
    });

    it("throws for unauthenticated users", async () => {
      await expect(
        t.mutation(api.conversations.create, { model: "gpt-4o" })
      ).rejects.toThrow("Not authenticated");
    });

    it("auto-creates user if not exists", async () => {
      // Don't pre-create user
      const result = await t.mutation(api.conversations.create, {
        model: "gpt-4o",
      }).withIdentity(mockUserIdentity("new-user-clerk-id"));

      expect(result).toBeDefined();

      // User should now exist
      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", "new-user-clerk-id"))
          .first();
      });

      expect(user).toBeDefined();
    });
  });

  describe("get query", () => {
    it("returns conversation for owner", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId, { title: "My Chat" });

      const result = await t.query(api.conversations.get, { id: convId })
        .withIdentity(mockUserIdentity());

      expect(result?.title).toBe("My Chat");
    });

    it("returns null for non-owner", async () => {
      const userId = await createTestUser(t, { clerkId: "owner" });
      const convId = await createTestConversation(t, userId);

      // Query as different user
      await createTestUser(t, { clerkId: "other-user" });
      const result = await t.query(api.conversations.get, { id: convId })
        .withIdentity(mockUserIdentity("other-user"));

      expect(result).toBeNull();
    });
  });

  describe("pin mutation", () => {
    it("toggles pin status", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId, { isPinned: false });

      // Pin
      await t.mutation(api.conversations.togglePin, { id: convId })
        .withIdentity(mockUserIdentity());

      let conv = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conv?.isPinned).toBe(true);

      // Unpin
      await t.mutation(api.conversations.togglePin, { id: convId })
        .withIdentity(mockUserIdentity());

      conv = await t.run(async (ctx) => ctx.db.get(convId));
      expect(conv?.isPinned).toBe(false);
    });

    it("throws for empty conversation", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      // No messages - can't pin empty

      await expect(
        t.mutation(api.conversations.togglePin, { id: convId })
          .withIdentity(mockUserIdentity())
      ).rejects.toThrow();
    });
  });
});
```

### Step 3: Create Message Tests

```typescript
// convex/__tests__/messages.test.ts
//
// Tests for message queries and mutations

import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import {
  createTestEnv,
  mockUserIdentity,
  createTestUser,
  createTestConversation,
  createTestMessage,
} from "./helpers";

describe("convex/messages", () => {
  let t: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    t = createTestEnv();
  });

  describe("list query", () => {
    it("returns messages for conversation", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      await createTestMessage(t, convId, userId, { content: "Hello" });
      await createTestMessage(t, convId, userId, {
        content: "Hi there!",
        role: "assistant",
      });

      const result = await t.query(api.messages.list, { conversationId: convId })
        .withIdentity(mockUserIdentity());

      expect(result).toHaveLength(2);
    });

    it("returns empty for non-owner", async () => {
      const userId = await createTestUser(t, { clerkId: "owner" });
      const convId = await createTestConversation(t, userId);
      await createTestMessage(t, convId, userId);

      // Different user
      await createTestUser(t, { clerkId: "other" });
      const result = await t.query(api.messages.list, { conversationId: convId })
        .withIdentity(mockUserIdentity("other"));

      expect(result).toEqual([]);
    });

    it("orders by creation time ascending", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);

      const msg1 = await createTestMessage(t, convId, userId, {
        content: "First",
        createdAt: 1000,
      });
      const msg2 = await createTestMessage(t, convId, userId, {
        content: "Second",
        createdAt: 2000,
      });

      const result = await t.query(api.messages.list, { conversationId: convId })
        .withIdentity(mockUserIdentity());

      expect(result[0].content).toBe("First");
      expect(result[1].content).toBe("Second");
    });
  });

  describe("message status states", () => {
    // These map to OptimisticMessage.status from src/types/optimistic.ts
    const statuses = ["pending", "generating", "complete", "error"] as const;

    it.each(statuses)("handles status: %s", async (status) => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      await createTestMessage(t, convId, userId, { status });

      const result = await t.query(api.messages.list, { conversationId: convId })
        .withIdentity(mockUserIdentity());

      expect(result[0].status).toBe(status);
    });
  });

  describe("partialContent updates", () => {
    it("updates partialContent during generation", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      const msgId = await createTestMessage(t, convId, userId, {
        status: "generating",
        content: "",
        partialContent: "Partial...",
      });

      const result = await t.query(api.messages.list, { conversationId: convId })
        .withIdentity(mockUserIdentity());

      expect(result[0].status).toBe("generating");
      expect(result[0].partialContent).toBe("Partial...");
    });
  });
});
```

### Step 4: Create Cascade Delete Tests

```typescript
// convex/__tests__/cascade.test.ts
//
// Tests for cascade delete behavior
// Validates: deleting conversation removes related records

import { describe, it, expect, beforeEach } from "vitest";
import { api, internal } from "../_generated/api";
import {
  createTestEnv,
  mockUserIdentity,
  createTestUser,
  createTestConversation,
  createTestMessage,
} from "./helpers";

describe("cascade delete", () => {
  let t: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    t = createTestEnv();
  });

  describe("conversation deletion", () => {
    it("deletes all related messages", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      await createTestMessage(t, convId, userId, { content: "Msg 1" });
      await createTestMessage(t, convId, userId, { content: "Msg 2" });
      await createTestMessage(t, convId, userId, { content: "Msg 3" });

      // Verify messages exist
      let messages = await t.run(async (ctx) => {
        return await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(messages).toHaveLength(3);

      // Delete conversation
      await t.mutation(api.conversations.remove, { id: convId })
        .withIdentity(mockUserIdentity());

      // Verify messages deleted
      messages = await t.run(async (ctx) => {
        return await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(messages).toHaveLength(0);
    });

    it("deletes related bookmarks", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);
      const msgId = await createTestMessage(t, convId, userId);

      // Create bookmark
      await t.run(async (ctx) => {
        await ctx.db.insert("bookmarks", {
          userId,
          messageId: msgId,
          conversationId: convId,
          createdAt: Date.now(),
        });
      });

      // Verify bookmark exists
      let bookmarks = await t.run(async (ctx) => {
        return await ctx.db
          .query("bookmarks")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(bookmarks).toHaveLength(1);

      // Delete conversation
      await t.mutation(api.conversations.remove, { id: convId })
        .withIdentity(mockUserIdentity());

      // Verify bookmark deleted
      bookmarks = await t.run(async (ctx) => {
        return await ctx.db
          .query("bookmarks")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
      });
      expect(bookmarks).toHaveLength(0);
    });

    it("nullifies memory conversationId instead of delete", async () => {
      const userId = await createTestUser(t);
      const convId = await createTestConversation(t, userId);

      // Create memory linked to conversation
      const memoryId = await t.run(async (ctx) => {
        return await ctx.db.insert("memories", {
          userId,
          conversationId: convId,
          content: "Test memory",
          embedding: new Array(1536).fill(0.1),
          source: "conversation",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Delete conversation
      await t.mutation(api.conversations.remove, { id: convId })
        .withIdentity(mockUserIdentity());

      // Memory should exist but with null conversationId
      const memory = await t.run(async (ctx) => ctx.db.get(memoryId));
      expect(memory).toBeDefined();
      expect(memory?.conversationId).toBeNull();
    });
  });
});
```

### Step 5: Configure vitest for Convex

Update `vitest.config.ts` to include Convex tests:

```typescript
// vitest.config.ts (update include pattern)
export default defineConfig({
  // ...
  test: {
    // ...
    include: ["src/**/*.test.{ts,tsx}", "convex/**/*.test.ts"],
  },
});
```

---

## Verification

Run Convex tests:

```bash
# Run all tests
bun run test

# Run only Convex tests
bun run test convex

# Watch Convex tests
bun run test -- --watch convex
```

### Expected Outcomes:
- All auth guard tests pass
- Ownership verification works
- Cascade deletes clean up related records
- Message status states handled correctly

---

## Key Patterns

### 1. Using convex-test
```typescript
import { convexTest } from "convex-test";
import schema from "../schema";

const t = convexTest(schema);
const result = await t.query(api.conversations.list, {})
  .withIdentity(mockUserIdentity());
```

### 2. Mocking Identity
```typescript
// Matches Clerk identity structure
const identity = {
  subject: "clerk-user-id",
  email: "test@example.com",
  fullName: "Test User",
};
```

### 3. Direct DB Access in Tests
```typescript
// For setup/verification, bypass queries
await t.run(async (ctx) => {
  return await ctx.db.insert("users", { ... });
});
```

---

## What Comes Next

**Phase 4: React Component Tests**
- Test message rendering with status states
- Test optimistic UI behavior
- Use @testing-library/react

---

## Troubleshooting

### Schema Validation Errors
convex-test validates against schema. If you get validation errors:
1. Check field types match schema.ts
2. Ensure required fields are provided
3. Check index fields are correct

### Identity Not Set
If auth checks fail, ensure `.withIdentity()` is called:
```typescript
await t.query(api.conversations.list, {})
  .withIdentity(mockUserIdentity()); // Required!
```

### Action Testing
Actions require more setup (external API mocks). For Phase 3, focus on queries/mutations. Actions tested in Phase 2 (API routes) or manual testing.
