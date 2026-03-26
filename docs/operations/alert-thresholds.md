# Alert Thresholds

Evaluated every 5 minutes by `check-metrics-thresholds` Trigger.dev task.

## Thresholds

| Metric | Threshold | Severity | Window | Rationale |
|--------|-----------|----------|--------|-----------|
| TTFT p95 | 3000ms | warning (>6s critical) | 15 min | Users notice >3s first-token delay |
| Token rate p5 | 5 tok/s | warning | 15 min | Below 5 tok/s feels broken |
| Provider error rate | 5% | warning (>10% critical) | 15 min | >5% indicates provider issue |
| Checkpoint latency p95 | 500ms | warning | 15 min | Slow checkpoints delay resume |
| Stop latency p95 | 2000ms | warning | 15 min | Stop should feel instant |
| Router latency p95 | 1000ms | warning | 15 min | Router shouldn't add >1s |
| Resume success rate | <95% | critical | 15 min | Reconnect must be reliable |
| Stuck messages | >0 | critical | point-in-time | Zero tolerance for stuck state |

## Tuning

Initial thresholds are generous. After 1 week of production data:

1. Query PostHog for `generation_metrics` events
2. Calculate actual p95/p99 values
3. Set thresholds at 2x the observed p95
4. Tighten progressively as the system stabilizes

## Alert Destinations

- PostHog `alert_threshold_breached` events (queryable, dashboardable)
- Pino structured logs (type: `generation_metrics`)
- Future: Slack webhook integration
