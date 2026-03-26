import {
  createNeonDatabase,
  messages,
  type PersistenceDb,
  routingOutcomes,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { and, count, eq, gte, lt, or } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export interface ThresholdConfig {
  ttftP95Ms: number;
  tokenRateMinPerSec: number;
  providerErrorRatePercent: number;
  stuckMessageMaxCount: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  ttftP95Ms: 3000,
  tokenRateMinPerSec: 5,
  providerErrorRatePercent: 5,
  stuckMessageMaxCount: 0,
};

export interface ThresholdBreach {
  metric: string;
  threshold: number;
  actual: number;
  severity: "warning" | "critical";
}

const WINDOW_MS = 15 * 60 * 1000;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

export interface CheckMetricsThresholdsDependencies {
  db?: PersistenceDb;
  now?: () => number;
  thresholds?: ThresholdConfig;
  captureAnalyticsEvent?: (input: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => Promise<boolean>;
}

export async function checkMetricsThresholds(
  deps: CheckMetricsThresholdsDependencies = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? (() => Date.now());
  const thresholds = deps.thresholds ?? DEFAULT_THRESHOLDS;
  const windowStart = now() - WINDOW_MS;

  // Query recent routing outcomes
  const recentOutcomes = await db
    .select({
      status: routingOutcomes.status,
      ttftMs: routingOutcomes.ttftMs,
      latencyMs: routingOutcomes.latencyMs,
      outputTokens: routingOutcomes.outputTokens,
    })
    .from(routingOutcomes)
    .where(gte(routingOutcomes.createdAt, windowStart));

  // Query stuck messages
  const stuckCutoff = now() - STUCK_THRESHOLD_MS;
  const stuckResult = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        or(eq(messages.status, "pending"), eq(messages.status, "generating")),
        lt(messages.updatedAt, stuckCutoff),
      ),
    );
  const stuckMessageCount = stuckResult[0]?.count ?? 0;

  // Build metrics snapshot
  const ttftValues = recentOutcomes
    .map((o) => o.ttftMs)
    .filter((v): v is number => v !== null);
  const totalOutcomes = recentOutcomes.length;
  const errorOutcomes = recentOutcomes.filter(
    (o) => o.status === "error",
  ).length;

  // Evaluate thresholds
  const breaches: ThresholdBreach[] = [];

  if (ttftValues.length > 0) {
    const sorted = [...ttftValues].sort((a, b) => a - b);
    const p95Index = Math.ceil((95 / 100) * sorted.length) - 1;
    const p95 = sorted[Math.max(0, p95Index)];
    if (p95 > thresholds.ttftP95Ms) {
      breaches.push({
        metric: "ttft_p95",
        threshold: thresholds.ttftP95Ms,
        actual: p95,
        severity: p95 > thresholds.ttftP95Ms * 2 ? "critical" : "warning",
      });
    }
  }

  if (totalOutcomes > 0) {
    const errorRate = (errorOutcomes / totalOutcomes) * 100;
    if (errorRate > thresholds.providerErrorRatePercent) {
      breaches.push({
        metric: "provider_error_rate",
        threshold: thresholds.providerErrorRatePercent,
        actual: errorRate,
        severity:
          errorRate > thresholds.providerErrorRatePercent * 2
            ? "critical"
            : "warning",
      });
    }
  }

  if (stuckMessageCount > thresholds.stuckMessageMaxCount) {
    breaches.push({
      metric: "stuck_message_count",
      threshold: thresholds.stuckMessageMaxCount,
      actual: stuckMessageCount,
      severity: "critical",
    });
  }

  // Fire PostHog alerts
  let alertsFired = 0;
  if (deps.captureAnalyticsEvent && breaches.length > 0) {
    for (const breach of breaches) {
      await deps.captureAnalyticsEvent({
        distinctId: "system",
        event: "alert_threshold_breached",
        properties: {
          metric: breach.metric,
          threshold: breach.threshold,
          actual: breach.actual,
          severity: breach.severity,
          windowMs: WINDOW_MS,
        },
      });
      alertsFired++;
    }
  }

  return { breaches, alertsFired };
}

export const CHECK_METRICS_THRESHOLDS_CRON = {
  pattern: "*/5 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export const checkMetricsThresholdsTask = schedules.task({
  id: "check-metrics-thresholds",
  cron: CHECK_METRICS_THRESHOLDS_CRON,
  maxDuration: 60,
  retry: { maxAttempts: 1 },
  run: async () => checkMetricsThresholds(),
});
