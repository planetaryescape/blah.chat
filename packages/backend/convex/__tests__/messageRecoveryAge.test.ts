import { makeFunctionReference } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import {
  createTestConversationData,
  createTestMessageData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const recover = makeFunctionReference<"mutation">(
  "messages/recovery:recoverStuckMessages",
);
const now = Date.parse("2026-11-04T00:48:06.147Z");

afterEach(() => vi.useRealTimers());

async function fixture(
  status: "pending" | "generating" | "complete" | "error" | "stopped",
  createdAt: number,
  generationStartedAt?: number,
) {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const t = convexTest(schema);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", createTestUserData());
    const conversationId = await ctx.db.insert(
      "conversations",
      createTestConversationData(userId),
    );
    const messageId = await ctx.db.insert(
      "messages",
      createTestMessageData(conversationId, userId, {
        role: "assistant",
        status,
        createdAt,
        generationStartedAt,
      }),
    );
    const lockId = await ctx.db.insert("generationLocks", {
      userId,
      conversationId,
      messageId,
      pendingCount: 1,
      lockedAt: createdAt,
    });
    return { messageId, lockId };
  });
  const read = () =>
    t.run(async (ctx) => ({
      message: await ctx.db.get(ids.messageId),
      lock: await ctx.db.get(ids.lockId),
    }));
  return { t, read };
}

describe.each([
  "pending",
  "generating",
] as const)("%s message recovery age", (status) => {
  it("leaves a 2.8-second-old message and its lock untouched without a start timestamp", async () => {
    // convex-test's missing-value ordering differs from the hosted query engine.
    // Also verify this case with a read-only hosted predicate probe and a real send/refresh.
    const { t, read } = await fixture(status, now - 2_829);
    const before = await read();
    await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 0 });
    expect(await read()).toEqual(before);
  });

  it("recovers an old message without a start timestamp and releases its lock", async () => {
    const { t, read } = await fixture(status, now - 600_001);
    await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 1 });
    const after = await read();
    expect(after.message).toMatchObject({
      status: "error",
      generationCompletedAt: now,
    });
    expect(after.lock).toBeNull();
    await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 0 });
  });

  it("uses a recent start timestamp rather than an old creation time", async () => {
    const { t, read } = await fixture(status, now - 1_800_000, now - 2_829);
    const before = await read();
    await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 0 });
    expect(await read()).toEqual(before);
  });

  it("recovers an old explicit start timestamp", async () => {
    const { t, read } = await fixture(status, now - 1_800_000, now - 600_001);
    await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 1 });
    expect((await read()).message?.status).toBe("error");
    expect((await read()).lock).toBeNull();
  });
});

it.each([
  "complete",
  "error",
  "stopped",
] as const)("never recovers a terminal %s message", async (status) => {
  const { t, read } = await fixture(status, now - 1_800_000);
  const before = await read();
  await expect(t.mutation(recover, {})).resolves.toEqual({ recovered: 0 });
  expect(await read()).toEqual(before);
});
