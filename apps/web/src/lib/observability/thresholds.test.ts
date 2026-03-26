/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  evaluateThresholds,
  type MetricsSnapshot,
} from "./thresholds";

function createEmptySnapshot(): MetricsSnapshot {
  return {
    ttftValues: [],
    tokenRates: [],
    checkpointLatencies: [],
    stopLatencies: [],
    routerLatencies: [],
    totalOutcomes: 0,
    errorOutcomes: 0,
    resumeAttempts: 0,
    resumeSuccesses: 0,
    stuckMessageCount: 0,
  };
}

describe("evaluateThresholds", () => {
  it("returns no breaches when all metrics are within bounds", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      ttftValues: [500, 800, 1000, 1200, 1500],
      tokenRates: [20, 30, 40, 50],
      totalOutcomes: 100,
      errorOutcomes: 2,
      resumeAttempts: 10,
      resumeSuccesses: 10,
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    expect(breaches).toEqual([]);
  });

  it("returns breach when p95 TTFT exceeds threshold", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      ttftValues: [
        100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
        1400, 1500, 1600, 1700, 1800, 4000, 5000,
      ],
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    const ttftBreach = breaches.find((b) => b.metric === "ttft_p95");
    expect(ttftBreach).toBeDefined();
    expect(ttftBreach!.threshold).toBe(3000);
    expect(ttftBreach!.actual).toBeGreaterThan(3000);
  });

  it("returns breach when provider error rate exceeds threshold", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      totalOutcomes: 100,
      errorOutcomes: 10, // 10% > 5%
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    const errorBreach = breaches.find(
      (b) => b.metric === "provider_error_rate",
    );
    expect(errorBreach).toBeDefined();
    expect(errorBreach!.actual).toBe(10);
  });

  it("returns breach when stuck messages exist", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      stuckMessageCount: 3,
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    const stuckBreach = breaches.find(
      (b) => b.metric === "stuck_message_count",
    );
    expect(stuckBreach).toBeDefined();
    expect(stuckBreach!.actual).toBe(3);
  });

  it("returns breach when resume success rate is below threshold", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      resumeAttempts: 100,
      resumeSuccesses: 80, // 80% < 95%
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    const resumeBreach = breaches.find(
      (b) => b.metric === "resume_success_rate",
    );
    expect(resumeBreach).toBeDefined();
    expect(resumeBreach!.actual).toBe(80);
  });

  it("returns multiple breaches when multiple thresholds violated", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      ttftValues: Array(20).fill(5000), // all above 3000
      totalOutcomes: 100,
      errorOutcomes: 20, // 20% > 5%
      stuckMessageCount: 5,
    };

    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    expect(breaches.length).toBeGreaterThanOrEqual(3);
    expect(breaches.map((b) => b.metric)).toContain("ttft_p95");
    expect(breaches.map((b) => b.metric)).toContain("provider_error_rate");
    expect(breaches.map((b) => b.metric)).toContain("stuck_message_count");
  });

  it("skips TTFT check when no values available", () => {
    const snapshot = createEmptySnapshot();
    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    expect(breaches.find((b) => b.metric === "ttft_p95")).toBeUndefined();
  });

  it("skips resume check when no attempts recorded", () => {
    const snapshot = createEmptySnapshot();
    const breaches = evaluateThresholds(snapshot, DEFAULT_THRESHOLDS);
    expect(
      breaches.find((b) => b.metric === "resume_success_rate"),
    ).toBeUndefined();
  });

  it("supports custom threshold overrides", () => {
    const snapshot: MetricsSnapshot = {
      ...createEmptySnapshot(),
      ttftValues: [2000, 2100, 2200, 2300, 2400],
    };

    // Default threshold (3000) — no breach
    expect(evaluateThresholds(snapshot, DEFAULT_THRESHOLDS)).toEqual([]);

    // Tighter threshold (1500) — breach
    const breaches = evaluateThresholds(snapshot, {
      ...DEFAULT_THRESHOLDS,
      ttftP95Ms: 1500,
    });
    expect(breaches.find((b) => b.metric === "ttft_p95")).toBeDefined();
  });
});
