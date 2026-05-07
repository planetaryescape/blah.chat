# Production Environment Checklist

Sign off this list before promoting to production. Keys are derived from the
`parsePersistenceEnv` schema in `packages/persistence-postgres/src/env.ts`,
the Clerk integration in `apps/web/src/middleware.ts`, and the BYOD/BYOK
encryption helpers in `apps/web/src/lib/security/byok.ts`.

## Required

### Auth (Clerk)

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_ISSUER_DOMAIN`
- [ ] `CLERK_WEBHOOK_SECRET` — without this users hit a redirect loop on first sign-in

### Database (Neon Postgres)

- [ ] `DATABASE_URL` — Postgres connection string, must include `sslmode=require` for Neon

### Redis (Upstash)

- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`

### Object storage (Cloudflare R2)

- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET` (or legacy alias `R2_BUCKET_NAME`)

### Background jobs (Trigger.dev)

- [ ] `TRIGGER_SECRET_KEY`
- [ ] `TRIGGER_API_URL` — defaults to `https://api.trigger.dev`

### Internal task auth (BYOK callback)

- [ ] `INTERNAL_TASK_SECRET` — shared bearer token Trigger uses to call
      `/api/internal/generations/[id]/process`. Must match the secret the
      web app expects.
- [ ] `INTERNAL_TASK_BASE_URL` — base URL the Trigger worker uses when
      calling the web app back (e.g., `https://your-app.vercel.app`).

### AI Gateway

- [ ] `AI_GATEWAY_API_KEY` — Vercel AI Gateway key for non-BYOK users

### Encryption

- [ ] `BYOD_ENCRYPTION_KEY` — used to encrypt BYOK provider keys and BYOD
      Neon connection strings. 64-char hex preferred, otherwise SHA-256 of
      the raw value is used. Treat as a long-lived secret — rotating it
      breaks every stored credential.

## Recommended

- [ ] Sentry DSN (`SENTRY_DSN`) for error reporting
- [ ] Uptime monitor pointed at `/api/v1/health`
- [ ] PostHog API key for analytics

## Optional

- [ ] `R2_ENDPOINT`, `R2_REGION`, `R2_FORCE_PATH_STYLE`, `R2_PUBLIC_BASE_URL`
      — only needed for non-default R2 setups
- [ ] `OPENAI_API_KEY` — only required if not using Vercel AI Gateway for
      Whisper transcription
- [ ] `TAVILY_API_KEY`, `JINA_API_KEY`, `E2B_API_KEY`, `FIRECRAWL_API_KEY`
      — tool integrations; safe to omit if you don't expose those tools

## Health check

After deploy, `GET /api/v1/health` must return `200` with all components
reporting `"ok"`:

```json
{
  "data": {
    "persistence": {
      "database": "ok",
      "redis": "ok",
      "r2": "ok",
      "trigger": "ok"
    }
  }
}
```

## BYOD / BYOK lifecycle

- BYOK enable validates the user's gateway key against the upstream API
  before storing it.
- BYOD enable validates the user's Neon connection, runs schema migrations
  against it, and only flips `connectionStatus` to `"connected"` on success.
- Disabling BYOK clears the gateway key and falls back to
  `AI_GATEWAY_API_KEY`.
- Disabling BYOD currently keeps the row at the previous status — new chat
  data goes back to the primary database. Export-then-disable is the
  recommended path until per-user DB routing for chat tables ships.
