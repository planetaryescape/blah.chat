import type {
  GenerationMetricsSummary,
  MetricsCollectorDependencies,
  ProviderErrorRecord,
} from "./types";

export class MetricsCollector {
  private ttftMs: number | null = null;
  private tokenRate: number | null = null;
  private checkpointLatencies: number[] = [];
  private stopLatencyMs: number | null = null;
  private streamFanoutLatencyMs: number | null = null;
  private resumeTotal = 0;
  private resumeSuccesses = 0;
  private routerLatencyMs: number | null = null;
  private providerErrors: ProviderErrorRecord[] = [];

  constructor(private readonly deps: MetricsCollectorDependencies) {}

  recordTTFT(ms: number) {
    this.ttftMs = ms;
  }

  recordTokenRate(tokens: number, durationMs: number) {
    this.tokenRate = durationMs > 0 ? (tokens / durationMs) * 1000 : null;
  }

  recordCheckpointLatency(ms: number) {
    this.checkpointLatencies.push(ms);
  }

  recordStopLatency(ms: number) {
    this.stopLatencyMs = ms;
  }

  recordStreamFanoutLatency(ms: number) {
    this.streamFanoutLatencyMs = ms;
  }

  recordResumeAttempt(success: boolean) {
    this.resumeTotal++;
    if (success) {
      this.resumeSuccesses++;
    }
  }

  recordRouterLatency(ms: number) {
    this.routerLatencyMs = ms;
  }

  recordProviderError(provider: string, error: string, classification: string) {
    this.providerErrors.push({ provider, error, classification });
  }

  summarize(): GenerationMetricsSummary {
    return {
      ttftMs: this.ttftMs,
      tokenRate: this.tokenRate,
      checkpointLatencies: [...this.checkpointLatencies],
      stopLatencyMs: this.stopLatencyMs,
      streamFanoutLatencyMs: this.streamFanoutLatencyMs,
      resumeAttempts: {
        total: this.resumeTotal,
        successes: this.resumeSuccesses,
      },
      routerLatencyMs: this.routerLatencyMs,
      providerErrors: [...this.providerErrors],
    };
  }

  async flush(distinctId: string) {
    const summary = this.summarize();

    const hasData =
      summary.ttftMs !== null ||
      summary.tokenRate !== null ||
      summary.checkpointLatencies.length > 0 ||
      summary.stopLatencyMs !== null ||
      summary.streamFanoutLatencyMs !== null ||
      summary.resumeAttempts.total > 0 ||
      summary.routerLatencyMs !== null ||
      summary.providerErrors.length > 0;

    if (!hasData) {
      return;
    }

    const properties: Record<string, unknown> = {
      type: "generation_metrics",
      ...flattenSummary(summary),
    };

    this.deps.logger.info(properties, "generation_metrics");

    if (this.deps.captureAnalyticsEvent) {
      const { type: _, ...eventProperties } = properties;
      await this.deps.captureAnalyticsEvent({
        distinctId,
        event: "generation_metrics",
        properties: eventProperties,
      });
    }

    this.reset();
  }

  private reset() {
    this.ttftMs = null;
    this.tokenRate = null;
    this.checkpointLatencies = [];
    this.stopLatencyMs = null;
    this.streamFanoutLatencyMs = null;
    this.resumeTotal = 0;
    this.resumeSuccesses = 0;
    this.routerLatencyMs = null;
    this.providerErrors = [];
  }
}

function flattenSummary(
  summary: GenerationMetricsSummary,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  if (summary.ttftMs !== null) flat.ttftMs = summary.ttftMs;
  if (summary.tokenRate !== null) flat.tokenRate = summary.tokenRate;
  if (summary.checkpointLatencies.length > 0) {
    flat.checkpointLatencies = summary.checkpointLatencies;
    flat.checkpointLatencyAvg =
      summary.checkpointLatencies.reduce((a, b) => a + b, 0) /
      summary.checkpointLatencies.length;
  }
  if (summary.stopLatencyMs !== null)
    flat.stopLatencyMs = summary.stopLatencyMs;
  if (summary.streamFanoutLatencyMs !== null)
    flat.streamFanoutLatencyMs = summary.streamFanoutLatencyMs;
  if (summary.resumeAttempts.total > 0)
    flat.resumeAttempts = summary.resumeAttempts;
  if (summary.routerLatencyMs !== null)
    flat.routerLatencyMs = summary.routerLatencyMs;
  if (summary.providerErrors.length > 0)
    flat.providerErrors = summary.providerErrors;

  return flat;
}
