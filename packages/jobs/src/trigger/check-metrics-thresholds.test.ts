import {
  messages,
  routingDecisions,
  routingOutcomes,
} from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { checkMetricsThresholds } from "./check-metrics-thresholds";

async function seedOutcomes(
  db: Awaited<ReturnType<typeof createTestPersistenceDb>>,
  outcomes: Array<{
    status: string;
    ttftMs?: number | null;
    latencyMs?: number | null;
    outputTokens?: number | null;
    createdAt?: number;
  }>,
) {
  // Create a routing decision to reference
  const [decision] = await db
    .insert(routingDecisions)
    .values({
      selectedModelId: "openai:gpt-5-mini",
      routeLabel: "fallback_default",
    })
    .returning();

  for (const outcome of outcomes) {
    await db.insert(routingOutcomes).values({
      decisionId: decision.id,
      status: outcome.status,
      ttftMs: outcome.ttftMs ?? null,
      latencyMs: outcome.latencyMs ?? null,
      outputTokens: outcome.outputTokens ?? null,
      createdAt: outcome.createdAt ?? Date.now(),
    });
  }
}

describe("checkMetricsThresholds", () => {
  it("returns no breaches when metrics are healthy", async () => {
    const db = await createTestPersistenceDb();

    await seedOutcomes(
      db,
      Array.from({ length: 20 }, () => ({
        status: "complete",
        ttftMs: 500,
        latencyMs: 2000,
        outputTokens: 100,
      })),
    );

    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
      captureAnalyticsEvent: async () => true,
    });

    expect(result.breaches).toEqual([]);
    expect(result.alertsFired).toBe(0);
  });

  it("detects high TTFT and fires alert", async () => {
    const db = await createTestPersistenceDb();

    await seedOutcomes(db, [
      ...Array.from({ length: 18 }, () => ({
        status: "complete",
        ttftMs: 1000,
      })),
      { status: "complete", ttftMs: 5000 },
      { status: "complete", ttftMs: 6000 },
    ]);

    const events: Array<{ event: string }> = [];
    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
      captureAnalyticsEvent: async (input) => {
        events.push(input);
        return true;
      },
    });

    expect(result.breaches.length).toBeGreaterThanOrEqual(1);
    expect(result.breaches.find((b) => b.metric === "ttft_p95")).toBeDefined();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].event).toBe("alert_threshold_breached");
  });

  it("detects high error rate", async () => {
    const db = await createTestPersistenceDb();

    await seedOutcomes(db, [
      ...Array.from({ length: 8 }, () => ({ status: "complete" })),
      { status: "error" },
      { status: "error" },
    ]);

    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
    });

    const errorBreach = result.breaches.find(
      (b) => b.metric === "provider_error_rate",
    );
    expect(errorBreach).toBeDefined();
    expect(errorBreach!.actual).toBe(20); // 2/10 = 20%
  });

  it("detects stuck messages", async () => {
    const { conversations, users } = await import(
      "@blah-chat/persistence-postgres"
    );
    const db = await createTestPersistenceDb();
    const now = Date.now();

    // Create user + conversation to satisfy FK constraints
    const [user] = await db
      .insert(users)
      .values({
        clerkId: "clerk_stuck",
        email: "stuck@test.com",
        name: "Stuck",
      })
      .returning();
    const [conv] = await db
      .insert(conversations)
      .values({ userId: user.id, title: "Test", model: "openai:gpt-5-mini" })
      .returning();

    // Insert a stuck message (pending, old updatedAt)
    await db.insert(messages).values({
      conversationId: conv.id,
      userId: user.id,
      role: "assistant",
      content: "",
      status: "pending",
      isConsolidation: false,
      siblingIndex: 0,
      createdAt: now - 20 * 60 * 1000,
      updatedAt: now - 20 * 60 * 1000,
    });

    const result = await checkMetricsThresholds({
      db,
      now: () => now,
    });

    const stuckBreach = result.breaches.find(
      (b) => b.metric === "stuck_message_count",
    );
    expect(stuckBreach).toBeDefined();
    expect(stuckBreach!.actual).toBeGreaterThanOrEqual(1);
  });

  it("returns summary with breach count", async () => {
    const db = await createTestPersistenceDb();

    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
    });

    expect(result).toHaveProperty("breaches");
    expect(result).toHaveProperty("alertsFired");
    expect(typeof result.alertsFired).toBe("number");
  });

  it("sends Slack webhook when breaches detected and webhook configured", async () => {
    const db = await createTestPersistenceDb();

    await seedOutcomes(db, [
      ...Array.from({ length: 18 }, () => ({
        status: "complete",
        ttftMs: 1000,
      })),
      { status: "complete", ttftMs: 5000 },
      { status: "complete", ttftMs: 6000 },
    ]);

    const slackPayloads: unknown[] = [];
    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
      sendSlackAlert: async (payload) => {
        slackPayloads.push(payload);
      },
    });

    expect(result.breaches.length).toBeGreaterThanOrEqual(1);
    expect(slackPayloads.length).toBe(1);
    const payload = slackPayloads[0] as { text: string };
    expect(payload.text).toContain("ttft_p95");
  });

  it("skips Slack when no breaches", async () => {
    const db = await createTestPersistenceDb();

    await seedOutcomes(
      db,
      Array.from({ length: 5 }, () => ({
        status: "complete",
        ttftMs: 200,
      })),
    );

    const slackPayloads: unknown[] = [];
    const result = await checkMetricsThresholds({
      db,
      now: () => Date.now(),
      sendSlackAlert: async (payload) => {
        slackPayloads.push(payload);
      },
    });

    expect(result.breaches).toEqual([]);
    expect(slackPayloads).toHaveLength(0);
  });
});
