import { percentile } from "@/lib/api/monitoring";

export interface ThresholdConfig {
  ttftP95Ms: number;
  tokenRateMinPerSec: number;
  providerErrorRatePercent: number;
  checkpointLatencyP95Ms: number;
  stopLatencyP95Ms: number;
  routerLatencyP95Ms: number;
  resumeSuccessRateMinPercent: number;
  stuckMessageMaxCount: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  ttftP95Ms: 3000,
  tokenRateMinPerSec: 5,
  providerErrorRatePercent: 5,
  checkpointLatencyP95Ms: 500,
  stopLatencyP95Ms: 2000,
  routerLatencyP95Ms: 1000,
  resumeSuccessRateMinPercent: 95,
  stuckMessageMaxCount: 0,
};

export interface MetricsSnapshot {
  ttftValues: number[];
  tokenRates: number[];
  checkpointLatencies: number[];
  stopLatencies: number[];
  routerLatencies: number[];
  totalOutcomes: number;
  errorOutcomes: number;
  resumeAttempts: number;
  resumeSuccesses: number;
  stuckMessageCount: number;
}

export interface ThresholdBreach {
  metric: string;
  threshold: number;
  actual: number;
  severity: "warning" | "critical";
}

export function evaluateThresholds(
  snapshot: MetricsSnapshot,
  config: ThresholdConfig,
): ThresholdBreach[] {
  const breaches: ThresholdBreach[] = [];

  if (snapshot.ttftValues.length > 0) {
    const p95 = percentile(snapshot.ttftValues, 95);
    if (p95 > config.ttftP95Ms) {
      breaches.push({
        metric: "ttft_p95",
        threshold: config.ttftP95Ms,
        actual: p95,
        severity: p95 > config.ttftP95Ms * 2 ? "critical" : "warning",
      });
    }
  }

  if (snapshot.tokenRates.length > 0) {
    const p5 = percentile(snapshot.tokenRates, 5);
    if (p5 < config.tokenRateMinPerSec) {
      breaches.push({
        metric: "token_rate_p5",
        threshold: config.tokenRateMinPerSec,
        actual: p5,
        severity: "warning",
      });
    }
  }

  if (snapshot.totalOutcomes > 0) {
    const errorRate = (snapshot.errorOutcomes / snapshot.totalOutcomes) * 100;
    if (errorRate > config.providerErrorRatePercent) {
      breaches.push({
        metric: "provider_error_rate",
        threshold: config.providerErrorRatePercent,
        actual: errorRate,
        severity:
          errorRate > config.providerErrorRatePercent * 2
            ? "critical"
            : "warning",
      });
    }
  }

  if (snapshot.checkpointLatencies.length > 0) {
    const p95 = percentile(snapshot.checkpointLatencies, 95);
    if (p95 > config.checkpointLatencyP95Ms) {
      breaches.push({
        metric: "checkpoint_latency_p95",
        threshold: config.checkpointLatencyP95Ms,
        actual: p95,
        severity: "warning",
      });
    }
  }

  if (snapshot.stopLatencies.length > 0) {
    const p95 = percentile(snapshot.stopLatencies, 95);
    if (p95 > config.stopLatencyP95Ms) {
      breaches.push({
        metric: "stop_latency_p95",
        threshold: config.stopLatencyP95Ms,
        actual: p95,
        severity: "warning",
      });
    }
  }

  if (snapshot.routerLatencies.length > 0) {
    const p95 = percentile(snapshot.routerLatencies, 95);
    if (p95 > config.routerLatencyP95Ms) {
      breaches.push({
        metric: "router_latency_p95",
        threshold: config.routerLatencyP95Ms,
        actual: p95,
        severity: "warning",
      });
    }
  }

  if (snapshot.resumeAttempts > 0) {
    const successRate =
      (snapshot.resumeSuccesses / snapshot.resumeAttempts) * 100;
    if (successRate < config.resumeSuccessRateMinPercent) {
      breaches.push({
        metric: "resume_success_rate",
        threshold: config.resumeSuccessRateMinPercent,
        actual: successRate,
        severity: "critical",
      });
    }
  }

  if (snapshot.stuckMessageCount > config.stuckMessageMaxCount) {
    breaches.push({
      metric: "stuck_message_count",
      threshold: config.stuckMessageMaxCount,
      actual: snapshot.stuckMessageCount,
      severity: "critical",
    });
  }

  return breaches;
}
