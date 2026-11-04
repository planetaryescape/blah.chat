import { makeFunctionReference } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "../../__tests__/testSetup";
import { api } from "../_generated/api";
import {
  createMockIdentity,
  createTestUsageRecordData,
  createTestUserData,
} from "../lib/test/factories";
import schema from "../schema";

const provider = vi.hoisted(() => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: provider.generateText,
  generateObject: provider.generateObject,
}));

afterEach(() => {
  provider.generateText.mockReset();
  provider.generateObject.mockReset();
});

async function fixture(budget = 10) {
  const t = convexTest(schema);
  const ownerIdentity = createMockIdentity({ subject: "summary-owner" });
  const otherIdentity = createMockIdentity({ subject: "summary-other" });
  const ids = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: ownerIdentity.subject }),
    );
    await ctx.db.insert(
      "users",
      createTestUserData({ clerkId: otherIdentity.subject }),
    );
    await ctx.db.insert("adminSettings", {
      autoMemoryExtractEnabled: false,
      autoMemoryExtractInterval: 5,
      enableHybridSearch: false,
      defaultMonthlyBudget: budget,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: true,
      defaultDailyMessageLimit: 50,
      alertEmail: "test@example.com",
      updatedBy: ownerId,
      updatedAt: Date.now(),
    });
    return { ownerId };
  });
  return {
    t,
    ownerId: ids.ownerId,
    owner: t.withIdentity(ownerIdentity),
    other: t.withIdentity(otherIdentity),
  };
}

describe("paid auxiliary action boundaries", () => {
  // The first action lazily loads the generation module graph; cold CI exceeded 5s.
  // Keep a bounded startup allowance without retries or relaxing any boundary assertion.
  it("rejects anonymous, empty, and oversized summaries before provider work", {
    timeout: 20_000,
  }, async () => {
    const { t, owner } = await fixture();

    await expect(
      t.action(api.generation.summarizeSelection, { text: "private text" }),
    ).rejects.toThrow("Not authenticated");
    await expect(
      owner.action(api.generation.summarizeSelection, { text: "  " }),
    ).rejects.toThrow("Select some text");
    await expect(
      owner.action(api.generation.summarizeSelection, {
        text: "x".repeat(16_001),
      }),
    ).rejects.toThrow("maximum 16000 characters");

    expect(provider.generateText).not.toHaveBeenCalled();
  });

  it("checks the authenticated caller's monthly budget before model work", async () => {
    const { t, owner, ownerId, other } = await fixture(0.01);
    await t.run(async (ctx) => {
      await ctx.db.insert(
        "usageRecords",
        createTestUsageRecordData(ownerId, { cost: 0.02 }),
      );
    });

    await expect(
      owner.action(api.generation.summarizeSelection, { text: "owner text" }),
    ).rejects.toThrow("Monthly budget exceeded");

    // A different authenticated user is charged against their own budget.
    provider.generateText.mockResolvedValue({
      text: "other user's summary",
      usage: Promise.resolve({ inputTokens: 20, outputTokens: 5 }),
    });
    await expect(
      other.action(api.generation.summarizeSelection, { text: "other text" }),
    ).resolves.toEqual({ summary: "other user's summary" });
    expect(provider.generateText).toHaveBeenCalledTimes(1);
  });

  it("rejects when estimated maximum request cost exceeds remaining budget", async () => {
    const { owner } = await fixture(0.000000001);

    await expect(
      owner.action(api.generation.summarizeSelection, {
        text: "small input, but not enough budget for the capped request",
      }),
    ).rejects.toThrow("Insufficient remaining monthly budget");
    expect(provider.generateText).not.toHaveBeenCalled();
  });

  it("records successful owner usage through the real usage mutation", async () => {
    const { t, owner, ownerId } = await fixture();
    provider.generateText.mockResolvedValue({
      text: "short summary",
      usage: Promise.resolve({ inputTokens: 42, outputTokens: 8 }),
    });

    await expect(
      owner.action(api.generation.summarizeSelection, {
        text: "A bounded selection.",
      }),
    ).resolves.toEqual({ summary: "short summary" });

    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: ownerId,
      model: "openai:gpt-oss-120b",
      inputTokens: 42,
      outputTokens: 8,
      messageCount: 1,
      feature: "chat",
      operationType: "text",
    });
    expect(records[0].cost).toBeGreaterThan(0);
    expect(provider.generateText.mock.calls[0]?.[0]).toMatchObject({
      maxRetries: 0,
      maxOutputTokens: 1_024,
    });
  });

  it("records usage attached to a provider failure", async () => {
    const { t, owner, ownerId } = await fixture();
    provider.generateText.mockRejectedValue(
      Object.assign(new Error("provider failed after inference"), {
        usage: { inputTokens: 13, outputTokens: 2 },
      }),
    );

    await expect(
      owner.action(api.generation.summarizeSelection, { text: "selection" }),
    ).rejects.toThrow("provider failed after inference");

    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: ownerId,
      inputTokens: 13,
      outputTokens: 2,
      messageCount: 1,
      feature: "chat",
    });
  });

  it("releases a worker slot after abort and records usage once per attempt", async () => {
    const { t, owner, ownerId } = await fixture();
    provider.generateText.mockRejectedValue(
      Object.assign(new Error("inference aborted"), {
        name: "AbortError",
        usage: { inputTokens: 17, outputTokens: 4 },
      }),
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        owner.action(api.generation.summarizeSelection, {
          text: `aborted selection ${attempt}`,
        }),
      ).rejects.toThrow("Summary generation timed out");
    }
    expect(provider.generateText).toHaveBeenCalledTimes(3);
    const records = await t.run((ctx) =>
      ctx.db.query("usageRecords").collect(),
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: ownerId,
      inputTokens: 51,
      outputTokens: 12,
      messageCount: 3,
      feature: "chat",
    });
  });

  it("caps concurrent summaries on a worker", async () => {
    const { owner } = await fixture();
    let releaseProvider!: () => void;
    const pendingProvider = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    provider.generateText.mockImplementation(async () => {
      await pendingProvider;
      return {
        text: "bounded summary",
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 3 }),
      };
    });

    const first = owner.action(api.generation.summarizeSelection, {
      text: "first selection",
    });
    const second = owner.action(api.generation.summarizeSelection, {
      text: "second selection",
    });
    try {
      await vi.waitFor(() =>
        expect(provider.generateText).toHaveBeenCalledTimes(2),
      );
      await expect(
        owner.action(api.generation.summarizeSelection, {
          text: "third selection",
        }),
      ).rejects.toThrow("Summary generation is busy");
    } finally {
      releaseProvider();
    }

    await expect(Promise.all([first, second])).resolves.toEqual([
      { summary: "bounded summary" },
      { summary: "bounded summary" },
    ]);
    expect(provider.generateText).toHaveBeenCalledTimes(2);
  });

  it("does not register either retired extraction action for stale clients", async () => {
    const { t, owner } = await fixture();

    for (const path of [
      "ai/taskExtraction:extractTasksFromTranscript",
      "ai/meetingExtraction:extractFromMeeting",
    ]) {
      const reference = makeFunctionReference<"action", { transcript: string }>(
        path,
      );
      for (const client of [t, owner]) {
        await expect(
          client.action(reference, {
            transcript: "private transcript with an action item",
          }),
        ).rejects.toThrow(`Could not find module for: "${path.split(":")[0]}"`);
      }
    }

    expect(provider.generateText).not.toHaveBeenCalled();
    expect(provider.generateObject).not.toHaveBeenCalled();
  });
});
