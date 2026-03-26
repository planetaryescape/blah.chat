/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { MetricsCollector } from "./metrics";
import type { MetricsCollectorDependencies } from "./types";

function createTestDeps(): MetricsCollectorDependencies & {
  logCalls: Array<{ obj: Record<string, unknown>; msg: string }>;
  analyticsCalls: Array<{
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }>;
} {
  const logCalls: Array<{ obj: Record<string, unknown>; msg: string }> = [];
  const analyticsCalls: Array<{
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }> = [];

  return {
    logCalls,
    analyticsCalls,
    logger: {
      info: (obj: Record<string, unknown>, msg: string) => {
        logCalls.push({ obj, msg });
      },
    },
    captureAnalyticsEvent: async (input) => {
      analyticsCalls.push(input);
      return true;
    },
  };
}

describe("MetricsCollector", () => {
  it("records TTFT in internal buffer", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordTTFT(450);

    const summary = collector.summarize();
    expect(summary.ttftMs).toBe(450);
  });

  it("records token rate from tokens and duration", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordTokenRate(100, 2000);

    const summary = collector.summarize();
    expect(summary.tokenRate).toBe(50); // 100 tokens / 2 seconds
  });

  it("records checkpoint latency and accumulates multiple", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordCheckpointLatency(10);
    collector.recordCheckpointLatency(15);
    collector.recordCheckpointLatency(8);

    const summary = collector.summarize();
    expect(summary.checkpointLatencies).toEqual([10, 15, 8]);
  });

  it("records stop latency", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordStopLatency(350);

    const summary = collector.summarize();
    expect(summary.stopLatencyMs).toBe(350);
  });

  it("records stream fanout latency", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordStreamFanoutLatency(25);

    const summary = collector.summarize();
    expect(summary.streamFanoutLatencyMs).toBe(25);
  });

  it("tracks resume attempts with success/failure counts", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordResumeAttempt(true);
    collector.recordResumeAttempt(true);
    collector.recordResumeAttempt(false);

    const summary = collector.summarize();
    expect(summary.resumeAttempts).toEqual({ total: 3, successes: 2 });
  });

  it("records router latency", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordRouterLatency(120);

    const summary = collector.summarize();
    expect(summary.routerLatencyMs).toBe(120);
  });

  it("records provider errors with classification", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordProviderError("openai", "rate limited", "rate_limit");
    collector.recordProviderError("anthropic", "timeout", "network_timeout");

    const summary = collector.summarize();
    expect(summary.providerErrors).toEqual([
      {
        provider: "openai",
        error: "rate limited",
        classification: "rate_limit",
      },
      {
        provider: "anthropic",
        error: "timeout",
        classification: "network_timeout",
      },
    ]);
  });

  it("returns empty summary when nothing recorded", () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    const summary = collector.summarize();
    expect(summary).toEqual({
      ttftMs: null,
      tokenRate: null,
      checkpointLatencies: [],
      stopLatencyMs: null,
      streamFanoutLatencyMs: null,
      resumeAttempts: { total: 0, successes: 0 },
      routerLatencyMs: null,
      providerErrors: [],
    });
  });

  it("flush calls logger.info with structured metrics", async () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordTTFT(200);
    collector.recordTokenRate(80, 1600);
    await collector.flush("user_123");

    expect(deps.logCalls).toHaveLength(1);
    expect(deps.logCalls[0].msg).toBe("generation_metrics");
    expect(deps.logCalls[0].obj).toMatchObject({
      type: "generation_metrics",
      ttftMs: 200,
      tokenRate: 50,
    });
  });

  it("flush calls captureAnalyticsEvent with distinctId", async () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordTTFT(300);
    await collector.flush("user_456");

    expect(deps.analyticsCalls).toHaveLength(1);
    expect(deps.analyticsCalls[0]).toMatchObject({
      distinctId: "user_456",
      event: "generation_metrics",
      properties: { ttftMs: 300 },
    });
  });

  it("flush clears internal buffer", async () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    collector.recordTTFT(500);
    await collector.flush("user_789");

    const summary = collector.summarize();
    expect(summary.ttftMs).toBeNull();
  });

  it("flush is a no-op when nothing recorded", async () => {
    const deps = createTestDeps();
    const collector = new MetricsCollector(deps);

    await collector.flush("user_000");

    expect(deps.logCalls).toHaveLength(0);
    expect(deps.analyticsCalls).toHaveLength(0);
  });

  it("handles missing captureAnalyticsEvent gracefully", async () => {
    const deps = createTestDeps();
    delete (deps as any).captureAnalyticsEvent;
    const collector = new MetricsCollector({ logger: deps.logger });

    collector.recordTTFT(100);
    await collector.flush("user_no_posthog");

    expect(deps.logCalls).toHaveLength(1);
  });
});
