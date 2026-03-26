# Operational Runbooks

## Alert: TTFT p95 High

**Symptom:** Users experience slow first token. PostHog alert `ttft_p95` fires.

**Diagnosis:**
1. Check `check-provider-health` results in Trigger.dev dashboard
2. Check PostHog for `generation_metrics` events filtered by model
3. Is it one model or all? (provider-specific vs systemic)

**Response:**
- Single provider: Check provider status page. If degraded, the auto-router should already be avoiding it.
- All providers: Check Redis latency (Upstash dashboard). Check DB latency (Neon dashboard).
- Spike pattern: Check for context-heavy conversations causing slow prompt assembly.

## Alert: Provider Error Rate High

**Symptom:** >5% of generation sessions end in error. PostHog alert `provider_error_rate` fires.

**Diagnosis:**
1. Query `routing_outcomes` for recent errors: `SELECT status, count(*) FROM routing_outcomes WHERE created_at > now() - interval '15 minutes' GROUP BY status`
2. Check error metadata for patterns (rate_limit, auth_error, content_policy)
3. Check `provider_health_snapshots` for "down" status

**Response:**
- Rate limit: Check API key usage. Consider adding fallback keys.
- Auth errors: Verify API keys haven't expired/rotated.
- Content policy: Review flagged prompts for patterns.
- The auto-router's policy engine should deprioritize failing providers automatically.

## Alert: Stuck Messages

**Symptom:** Messages in pending/generating status past 10-minute threshold. PostHog alert `stuck_message_count` fires.

**Diagnosis:**
1. `recover-stuck-messages` cron runs every 2 minutes and should auto-recover
2. If still stuck: check if the recovery job itself is failing in Trigger.dev
3. Check `generation_sessions` for matching requests stuck in pending/running

**Response:**
- Recovery job failing: Check Trigger.dev logs, fix root cause
- Persistent stuck: Manual DB update to mark as error: `UPDATE messages SET status = 'error' WHERE status IN ('pending', 'generating') AND updated_at < now() - interval '10 minutes'`

## Alert: Resume Success Rate Low

**Symptom:** <95% of reconnect attempts succeed. PostHog alert `resume_success_rate` fires.

**Diagnosis:**
1. Check Redis health via `checkRedisStreamHealth` — are there zombie streams?
2. Check if Upstash Redis is experiencing latency or connection issues
3. Review recent deployments — did the streaming protocol change?

**Response:**
- Redis unhealthy: Check Upstash dashboard, restart if needed
- Zombie streams: The `cleanup-stale-generation-sessions` cron (every 5 min) should clean these up
- Protocol regression: Rollback recent streaming changes

## General Debugging

**Useful queries:**
- Recent metrics: PostHog > Events > `generation_metrics`
- Provider health: PostHog > Events > `alert_threshold_breached`
- Generation flow: Pino logs filtered by `type: "generation_metrics"`
- Routing decisions: `SELECT * FROM routing_decisions ORDER BY created_at DESC LIMIT 20`
