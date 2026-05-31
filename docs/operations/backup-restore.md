# Backup / Restore Runbook

GA requires restore evidence, not just backup settings. The production release
workflow enforces a recent drill via `bun run production:backup-drill:check`.

## Frequency

- Before GA.
- Every 30 days after GA.
- After any migration that changes chat, messages, user credentials, files, or
  billing/cost-tracking tables.

## Drill

1. Confirm Neon backups/PITR are enabled for the production project.
2. Restore production to an isolated Neon branch or temporary database.
3. Point a non-production deployment or local app at the restored database.
4. Verify a low-privilege test user can sign in and read existing conversations.
5. Verify a restored conversation contains its message tree, attachments,
   model metadata, usage/cost rows, and BYOK/BYOD settings where applicable.
6. Verify Cloudflare R2 objects referenced by restored attachments resolve.
7. Record the evidence link, timestamp, restore target, source timestamp, and
   any gaps found.

## Release Gate

Set these GitHub production environment variables after a successful drill:

- `BACKUP_RESTORE_DRILL_AT`: ISO timestamp, for example
  `2026-05-31T10:00:00Z`.
- `BACKUP_RESTORE_DRILL_URL`: link to the drill evidence.
- `BACKUP_RESTORE_DRILL_MAX_AGE_DAYS`: optional override; default `30`.

If the drill is missing, stale, in the future, or lacks an evidence URL,
production deploy fails before Vercel build/deploy.
