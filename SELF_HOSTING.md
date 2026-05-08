# Self-Hosting Guide

blah.chat can be self-hosted from a git checkout with Docker Compose. The
compose stack runs the web app and local infrastructure while keeping the
current production architecture intact.

## Architecture

- Web app: Next.js in `apps/web`
- Database: Postgres with pgvector
- Cache and live event log: Redis through an Upstash-compatible HTTP shim
- Object storage: S3-compatible storage via MinIO locally, Cloudflare R2 in production
- Background jobs: Trigger.dev
- Auth: Clerk
- AI: Vercel AI Gateway by default; per-user BYOK is supported
- Encryption: `BYOD_ENCRYPTION_KEY` for BYOK/BYOD secrets

The legacy Convex backend under `packages/backend/convex` is not required for
new deployments.

## Docker Compose

Start from the checked-out repository:

```bash
cp docker/env.example .env.docker
```

Edit `.env.docker` and set real values for:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CLERK_ISSUER_DOMAIN`
- `AI_GATEWAY_API_KEY` unless every user will use BYOK
- `TRIGGER_SECRET_KEY`
- `TRIGGER_API_URL` if not using `https://api.trigger.dev`
- `TRIGGER_ACCESS_TOKEN` if you run the local jobs profile with token auth
- `INTERNAL_TASK_SECRET`
- `BYOD_ENCRYPTION_KEY`

Run the full local stack:

```bash
BLAH_CHAT_ENV_FILE=.env.docker docker compose up
```

Open http://localhost:3000.

For a production-like run from the same checkout:

```bash
BLAH_CHAT_ENV_FILE=.env.docker BLAH_CHAT_MODE=production docker compose up -d
```

The web container runs `bun install --frozen-lockfile`, applies Drizzle
migrations, then starts Next.js.

## Included Services

- Web app: http://localhost:3000
- Postgres: `localhost:55432`
- Redis: `localhost:56379`
- Upstash-compatible Redis HTTP: `localhost:58079`
- MinIO S3 API: `localhost:59000`
- MinIO console: http://localhost:59001

Compose overrides the infrastructure URLs inside the web container. The values
in `docker/env.example` use host URLs so the same file can also seed a host-run
`.env.local` when you only run infra in Docker.

## Background Jobs

The app enqueues generation, embedding, transcription, and maintenance work
through Trigger.dev. After setting Trigger env vars and CLI auth, run the local worker too:

```bash
BLAH_CHAT_ENV_FILE=.env.docker docker compose --profile jobs up
```

For production, deploy `packages/jobs` to Trigger.dev and set
`INTERNAL_TASK_BASE_URL` to your public web URL. `INTERNAL_TASK_SECRET` must be
identical in the web runtime and Trigger worker runtime.

## Infra Only

If you want to run Bun on the host and only containerize dependencies:

```bash
docker compose -f docker-compose.dev.yml up -d
cp docker/env.example .env.local
# Edit .env.local with real external service keys.
bun install
bun run db:migrate
bun dev
```

Stop infra-only services with:

```bash
docker compose -f docker-compose.dev.yml down
```

## Required External Accounts

Compose does not replace these hosted services today:

- Clerk for auth and webhooks
- Vercel AI Gateway for non-BYOK model access
- Trigger.dev for durable background jobs

Advanced deployments can replace these integrations in code, but the stock app
expects them.

## Health Check

After startup, check:

```bash
curl http://localhost:3000/api/v1/health
```

The response is only fully healthy when Postgres, Redis, MinIO/R2, and
Trigger.dev all respond successfully.

## Updating

```bash
git pull origin main
BLAH_CHAT_ENV_FILE=.env.docker BLAH_CHAT_MODE=production docker compose up -d
```

The web entrypoint reruns migrations on startup.

## Troubleshooting

### `CREATE EXTENSION vector` fails

Use the provided compose files. They use `pgvector/pgvector:pg16`; the plain
Postgres image does not include pgvector.

### File uploads return unreachable MinIO URLs

Use the compose-provided `R2_ENDPOINT=http://minio.localhost:59000` inside the
web container. It resolves inside Docker and from the host browser.

### `/api/v1/health` reports Trigger errors

Set a valid `TRIGGER_SECRET_KEY`, deploy/run the Trigger worker, and ensure
`TRIGGER_API_URL` points at the Trigger API you use.

### Users loop back to sign-in

Configure Clerk webhooks for `user.created`, `user.updated`, and `user.deleted`
to call `/api/webhooks/clerk`, then set `CLERK_WEBHOOK_SECRET`.

## License

blah.chat is licensed under AGPLv3. If you modify it and run it as a network
service, AGPL Section 13 requires offering users access to the modified source.
