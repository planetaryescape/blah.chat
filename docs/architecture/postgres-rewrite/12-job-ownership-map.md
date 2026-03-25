# Phase 12: Job Ownership Map

All background work runs on Trigger.dev against the Postgres runtime.

## Scheduled Tasks (Cron)

| Task ID | Schedule | Purpose |
|---------|----------|---------|
| `check-provider-health` | `*/5 * * * *` | Probe OpenAI/Anthropic/Google latency and availability |
| `recover-stuck-messages` | `*/2 * * * *` | Fail messages stuck in pending/generating >10min |
| `cleanup-stale-generation-sessions` | `*/5 * * * *` | Fail pending generation sessions >60s old |
| `extract-inactive-conversations` | `*/15 * * * *` | Enqueue memory extraction for idle conversations |
| `cleanup-stale-incognito` | `30 * * * *` | Delete incognito conversations inactive >24h |
| `mark-expired-memories` | `0 3 * * *` | Hard-delete memories with expiresAt >90 days old |
| `telemetry-heartbeat` | `0 2 * * *` | Send anonymous instance metrics to PostHog |
| `check-health` | `0 */6 * * *` | Ping Postgres and Trigger API |

## On-Demand Tasks

| Task ID | Triggered By | Purpose |
|---------|-------------|---------|
| `embed-message` | Generation service (post-chat) | Embed message for search |
| `embed-note` | Note create/update | Embed note for search |
| `embed-task` | Task create/update | Embed task for search |
| `embed-file` | Attachment text extraction | Chunk and embed file content |
| `generate-title` | Generation service (new chat) | Auto-generate conversation title |
| `generate-image` | REST API (`/api/v1/actions/images/generate`) | Generate image from prompt |
| `analyze-model-fit` | Generation service (post-chat) | Recommend cheaper model if applicable |
| `enrich-source-metadata` | Generation service (post-chat) | Fetch OpenGraph metadata for source URLs |
| `extract-text` | Messages DAL (attachment upload) | Extract text from PDF/DOCX/etc |
| `extract-memories` | REST API + `extract-inactive-conversations` cron | Extract facts from conversation |
| `transcribe` | REST API (`/api/v1/actions/transcribe`) | Transcribe audio via Groq/OpenAI |
| `auto-triage-feedback` | Feedback creation | AI-triage feedback entries |
| `process-source` | Knowledge source creation | Process and chunk knowledge sources |
| `backfill-message-embeddings` | Manual/migration | Backfill missing message embeddings |
| `backfill-note-embeddings` | Manual/migration | Backfill missing note embeddings |
| `backfill-task-embeddings` | Manual/migration | Backfill missing task embeddings |

## Convex Crons Not Migrated (no Postgres equivalent)

| Convex Cron | Reason |
|-------------|--------|
| `cleanup-expired-jobs` | Convex-only `jobs` table; Trigger manages its own job lifecycle |
| `cleanup-old-notifications` | No `notifications` table in Postgres schema |
| `calculate-user-rankings` | No `userRankings` table in Postgres schema |
