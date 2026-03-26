export interface ProviderErrorRecord {
  provider: string;
  error: string;
  classification: string;
}

export interface GenerationMetricsSummary {
  ttftMs: number | null;
  tokenRate: number | null;
  checkpointLatencies: number[];
  stopLatencyMs: number | null;
  streamFanoutLatencyMs: number | null;
  resumeAttempts: { total: number; successes: number };
  routerLatencyMs: number | null;
  providerErrors: ProviderErrorRecord[];
}

export interface MetricsCollectorDependencies {
  logger: {
    info: (obj: Record<string, unknown>, msg: string) => void;
  };
  captureAnalyticsEvent?: (input: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => Promise<boolean>;
}
