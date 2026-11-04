import { DEADLINE_PARSING_MODEL } from "@blah-chat/ai/operational-models";
import { DEADLINE_PARSING_PROMPT } from "@blah-chat/ai/prompts/deadlineParsing";
import { getModel } from "@blah-chat/ai/registry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { internal } from "../_generated/api";
import { createTestUserData } from "../lib/test/factories";
import schema from "../schema";

const provider = vi.hoisted(() => ({
  embed: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  embed: provider.embed,
  generateObject: provider.generateObject,
}));

afterEach(() => {
  vi.useRealTimers();
  provider.embed.mockReset();
  provider.generateObject.mockReset();
});

async function createTask(deadline?: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T12:00:00.000Z"));
  provider.embed.mockResolvedValue({ embedding: [0.1, 0.2] });
  const t = convexTest(schema);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", createTestUserData({ clerkId: "deadline-owner" })),
  );

  // @ts-ignore - Convex type depth exceeds the limit with 90+ modules.
  const result = await t.action(internal.tools.taskManager.execute, {
    userId,
    operation: "create",
    title: "Prepare launch report",
    deadline,
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const task = await t.run((ctx) =>
    ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first(),
  );
  expect(task).not.toBeNull();

  return { result, task };
}

describe("task-manager deadline parsing after extraction retirement", () => {
  it("keeps relative-deadline parsing on its dedicated prompt and model", async () => {
    const expectedDeadline = "2026-11-06T17:00:00.000Z";
    provider.generateObject.mockResolvedValueOnce({
      object: { timestamp: expectedDeadline },
    });

    const { result, task } = await createTask("next Friday");

    expect(result.success).toBe(true);
    expect(task?.deadline).toBe(Date.parse(expectedDeadline));
    expect(task?.deadlineSource).toBe("next Friday");
    expect(provider.generateObject).toHaveBeenCalledTimes(1);

    const [request] = provider.generateObject.mock.calls[0];
    expect(request).toMatchObject({
      model: { modelId: getModel(DEADLINE_PARSING_MODEL.id).modelId },
    });
    const currentDate = request.prompt.match(
      /Current date and time: ([^\n]+)/,
    )?.[1];
    expect(currentDate).toBe("2026-11-03T12:00:00.000Z");
    expect(request.prompt).toBe(
      `${DEADLINE_PARSING_PROMPT.replace("{{CURRENT_DATE}}", currentDate ?? "")}` +
        '\n\nDeadline text: "next Friday"',
    );
  });

  it("creates the task without a deadline when parsing fails", async () => {
    provider.generateObject.mockRejectedValueOnce(
      new Error("provider unavailable"),
    );

    const { result, task } = await createTask("next Friday");

    expect(result.success).toBe(true);
    expect(task?.deadline).toBeUndefined();
    expect(task?.deadlineSource).toBe("next Friday");
    expect(provider.generateObject).toHaveBeenCalledTimes(1);
  });

  it("does not invoke parsing when no deadline is supplied", async () => {
    const { result, task } = await createTask();

    expect(result.success).toBe(true);
    expect(task?.deadline).toBeUndefined();
    expect(task?.deadlineSource).toBeUndefined();
    expect(provider.generateObject).not.toHaveBeenCalled();
  });
});
