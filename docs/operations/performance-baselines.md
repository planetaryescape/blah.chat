# Performance Baselines

Expected baseline values for the generation pipeline. Capture actuals after first deployment and update this document.

## Metrics

| Metric | Expected Baseline | How to Measure |
|--------|-------------------|----------------|
| TTFT (p50) | 500-1500ms | PostHog: `generation_metrics` > `ttftMs` |
| TTFT (p95) | 1500-3000ms | Same, p95 aggregation |
| Token rate (p50) | 15-40 tok/s | PostHog: `generation_metrics` > `tokenRate` |
| Token rate (p5) | 5-15 tok/s | Same, p5 aggregation |
| Checkpoint latency (p50) | 5-20ms | PostHog: `generation_metrics` > `checkpointLatencyAvg` |
| Stop latency (p50) | 250-1000ms | PostHog: `generation_metrics` > `stopLatencyMs` |
| Router latency (p50) | 50-200ms | PostHog: `generation_metrics` > `routerLatencyMs` |
| Provider error rate | <2% | `routing_outcomes` table: count(error)/count(*) |
| Resume success rate | >98% | PostHog: `generation_metrics` > `resumeAttempts` |

## Per-Provider Expected Performance

| Provider | Expected TTFT | Expected Token Rate |
|----------|---------------|---------------------|
| OpenAI (GPT-5-mini) | 300-800ms | 30-60 tok/s |
| Anthropic (Claude Haiku 4.5) | 400-1000ms | 25-50 tok/s |
| Google (Gemini 2.5 Flash) | 300-700ms | 30-70 tok/s |

## Establishing Baselines

1. Deploy with metrics instrumentation enabled
2. Wait 24-48 hours for representative traffic
3. Query PostHog for `generation_metrics` events
4. Calculate p50, p95, p99 for each metric
5. Update this document with actual values
6. Set alert thresholds at 2x observed p95

## Monitoring Dashboard

Create a PostHog dashboard with:

1. **TTFT trend** — line chart of p50/p95 TTFT over time
2. **Token rate distribution** — histogram of token rates
3. **Error rate trend** — line chart of error % per 15-min window
4. **Provider comparison** — TTFT by provider (breakdown)
5. **Stuck message count** — number gauge (should be 0)
6. **Alert breaches** — table of recent `alert_threshold_breached` events
